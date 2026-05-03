'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');
const { resolveReservationPricing } = require('../services/pricingService.cjs');
const { calculerStatutChambre } = require('../utils/statusHelper.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT r.*, c.nom, c.prenom, ch.numero as chambre_numero, b.nom as bloc_nom
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN chambres ch ON r.chambre_id = ch.id
      LEFT JOIN blocs b ON ch.bloc_id = b.id
      ORDER BY r.created_at DESC
      LIMIT 300
    `;
    const result = await db.all(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reservations/actives — réservations en cours (pour restauration, etc.)
router.get('/actives', requireAuth, async (req, res) => {
  try {
    const result = await db.all(`
      SELECT r.*, c.nom, c.prenom, c.groupe_sanguin, c.est_mineur,
             ch.numero as chambre_numero, b.nom as bloc_nom
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN chambres ch ON r.chambre_id = ch.id
      LEFT JOIN blocs b ON ch.bloc_id = b.id
      WHERE r.statut = 'checkin'
      ORDER BY r.date_arrivee DESC
    `);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reservations/pending-checkout — départs du jour
router.get('/pending-checkout', requireAuth, async (req, res) => {
  try {
    const result = await db.all(`
      SELECT r.*, c.nom, c.prenom, ch.numero as chambre_numero
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN chambres ch ON r.chambre_id = ch.id
      WHERE r.statut = 'checkin' AND DATE(r.date_checkout_prevu) <= CURRENT_DATE
      ORDER BY r.date_checkout_prevu ASC
    `);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reservations/checkin-groupe — check-in collectif
router.post('/checkin-groupe', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  try {
    const { groupe_id, chambre_ids, date_checkout_prevu, formule, mode_facturation } = req.body;
    if (!groupe_id || !chambre_ids?.length) return res.status(400).json({ error: 'groupe_id et chambre_ids obligatoires' });

    const membres = await db.all("SELECT * FROM clients WHERE groupe_id = $1 AND statut = 'en_attente'", [groupe_id]);
    if (!membres.length) return res.status(400).json({ error: 'Aucun membre en attente dans ce groupe' });

    const created = [];
    await db.transaction(async (client) => {
      for (let i = 0; i < membres.length && i < chambre_ids.length; i++) {
        const membre = membres[i];
        const chambre_id = chambre_ids[i];
        const chambreRes = await client.query("SELECT * FROM chambres WHERE id = $1", [chambre_id]);
        const chambre = chambreRes.rows[0];
        if (!chambre) continue;

        const pricing = await require('../services/pricingService.cjs').resolveReservationPricing({
          type_chambre: chambre.type, formule: formule || 'PC', grandCompteId: null
        });

        const resDb = await client.query(`
          INSERT INTO reservations (client_id, groupe_id, chambre_id, agent_id, tarif_id,
            prix_nuit_applique, prix_repas_applique, date_arrivee, date_checkout_prevu, formule, mode_facturation, statut)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, 'checkin') RETURNING id
        `, [membre.id, groupe_id, chambre_id, req.agent.id, pricing.tarif_id,
            pricing.prix_nuit, pricing.prix_repas, date_checkout_prevu, formule || 'PC', mode_facturation || 'direct']);
        created.push(resDb.rows[0].id);

        await client.query("UPDATE clients SET statut = 'enregistre' WHERE id = $1", [membre.id]);
        const newOcc = chambre.nb_occupants_actuels + 1;
        const newStatut = newOcc === 0 ? 'libre' : newOcc < chambre.capacite_max ? 'partielle' : 'occupee';
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1, statut=$2 WHERE id=$3", [newOcc, newStatut, chambre.id]);
      }
      await client.query("UPDATE groupes SET statut = 'actif' WHERE id = $1", [groupe_id]);
    });
    res.json({ success: true, reservations_creees: created.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/simulate', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  try {
    const { chambre_id, date_checkout_prevu, formule, mode_facturation, grand_compte_id } = req.body;
    if (!chambre_id || !date_checkout_prevu || !formule || !mode_facturation) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    const chambreRes = await db.query('SELECT * FROM chambres WHERE id = $1', [chambre_id]);
    const chambreData = chambreRes.rows[0];
    if (!chambreData) throw new Error('Chambre introuvable');

    const pricing = await resolveReservationPricing({
      type_chambre: chambreData.type,
      formule: formule,
      grandCompteId: mode_facturation === 'grand_compte' ? grand_compte_id : null,
    });

    const dateIn = new Date(); dateIn.setHours(0,0,0,0);
    const dateOut = new Date(date_checkout_prevu); dateOut.setHours(0,0,0,0);
    const nuits = Math.max(1, Math.ceil((dateOut - dateIn) / 86400000));
    
    const total_nuit = nuits * pricing.prix_nuit;
    const total_repas = nuits * pricing.prix_repas;

    res.json({
      nuits,
      prix_nuit: pricing.prix_nuit,
      prix_repas: pricing.prix_repas,
      total_nuit,
      total_repas,
      total: total_nuit + total_repas,
      source_tarif: pricing.source_tarif
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkin', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  const { 
    client_id, chambre_id, date_checkout_prevu, formule, mode_facturation,
    grand_compte_id, bon_commande_id, montant_encaisse, type_paiement
  } = req.body;

  if (!client_id || !chambre_id || !date_checkout_prevu || !formule || !mode_facturation) {
    return res.status(400).json({ error: 'Données manquantes pour le check-in' });
  }

  try {
    let result = {};
    await db.transaction(async (client) => {
      // Check session caisse if payment
      let session = null;
      if (montant_encaisse && montant_encaisse > 0) {
        const sessionRes = await client.query("SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'", [req.agent.id]);
        session = sessionRes.rows[0];
        if (!session) {
          throw new Error("Aucune session de caisse ouverte. Ouvrez une session avant d'encaisser.");
        }
      }

      // Vérifier client
      const clientDataRes = await client.query('SELECT * FROM clients WHERE id = $1', [client_id]);
      const clientData = clientDataRes.rows[0];
      if (!clientData) throw new Error('Client introuvable');
      if (clientData.statut === 'enregistre') throw new Error('Client déjà enregistré');

      // Vérifier chambre
      const chambreRes = await client.query('SELECT * FROM chambres WHERE id = $1', [chambre_id]);
      const chambreData = chambreRes.rows[0];
      if (!chambreData) throw new Error('Chambre introuvable');
      if (['occupee', 'travaux', 'bloquee', 'stock_etage'].includes(chambreData.statut)) {
         throw new Error(`La chambre n'est pas disponible (statut: ${chambreData.statut})`);
      }
      if (chambreData.nb_occupants_actuels >= chambreData.capacite_max) {
         throw new Error('Capacité maximale de la chambre atteinte');
      }

      // Calcul tarifs
      const pricing = await resolveReservationPricing({
        type_chambre: chambreData.type,
        formule: formule,
        grandCompteId: mode_facturation === 'grand_compte' ? grand_compte_id : null,
      });

      // Créer la réservation
      const resDb = await client.query(`
        INSERT INTO reservations (
          client_id, chambre_id, agent_id, tarif_id,
          prix_nuit_applique, prix_repas_applique,
          date_arrivee, date_checkout_prevu, formule, mode_facturation,
          grand_compte_id, bon_commande_id, statut
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, 'checkin')
        RETURNING id
      `, [
        client_id, chambre_id, req.agent.id, pricing.tarif_id,
        pricing.prix_nuit, pricing.prix_repas,
        date_checkout_prevu, formule, mode_facturation,
        grand_compte_id || null, bon_commande_id || null
      ]);

      const reservationId = resDb.rows[0].id;

      if (montant_encaisse && montant_encaisse > 0) {
        await client.query(`
          INSERT INTO encaissements 
            (reservation_id, client_id, agent_id, session_caisse_id, montant, type_paiement, formule, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          reservationId, client_id, req.agent.id, session.id, montant_encaisse, type_paiement || 'especes', formule, 'Paiement à la réception (Check-in)'
        ]);
        
        // Mettre à jour les totaux de la session en direct si nécessaire
        // (optionnel car la vue caisse peut faire un SUM, mais c'est bien)
        const colMap = {
           'especes': 'total_especes',
           'virement': 'total_virement',
           'cheque': 'total_cheques'
        };
        const col = colMap[type_paiement || 'especes'] || 'total_especes';
        await client.query(`UPDATE sessions_caisse SET ${col} = COALESCE(${col},0) + $1, total_general = COALESCE(total_general,0) + $1 WHERE id = $2`, [montant_encaisse, session.id]);
      }

      // Update Client statut & groupe_id if not set (but group handling is separate)
      await client.query("UPDATE clients SET statut = 'enregistre' WHERE id = $1", [client_id]);

      // Update Chambre
      const newNbOcc = chambreData.nb_occupants_actuels + 1;
      const newStatut = calculerStatutChambre(newNbOcc, chambreData.capacite_max);
      
      await client.query(
        "UPDATE chambres SET nb_occupants_actuels = $1, statut = $2 WHERE id = $3", 
        [newNbOcc, newStatut, chambreData.id]
      );

      // Increment BDC if B2B
      if (mode_facturation === 'grand_compte' && bon_commande_id) {
         // rough estimation: (nights * (price_nuit + price_repas))
         const dateIn = new Date(); dateIn.setHours(0,0,0,0);
         const dateOut = new Date(date_checkout_prevu); dateOut.setHours(0,0,0,0);
         const nuits = Math.max(1, Math.ceil((dateOut - dateIn) / 86400000));
         const estimatedCost = nuits * (pricing.prix_nuit + pricing.prix_repas);
         await client.query("UPDATE bons_de_commande SET montant_consomme = montant_consomme + $1 WHERE id = $2", [estimatedCost, bon_commande_id]);
      }

      await logAction(req.agent.id, 'CHECKIN', 'reservations', reservationId, { chambre_id, formule }, req.ip);

      result = { success: true, reservationId, chambreNum: chambreData.numero };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkout/:id', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  try {
    let result = {};
    await db.transaction(async (client) => {
      const resData = await client.query('SELECT * FROM reservations WHERE id = $1', [req.params.id]);
      const reservation = resData.rows[0];
      if (!reservation) throw new Error("Réservation introuvable");
      if (reservation.statut !== 'checkin') throw new Error("Cette réservation n'est pas en statut check-in");

      await client.query(
        "UPDATE reservations SET date_depart = NOW(), statut = 'checkout', agent_checkout_id = $1 WHERE id = $2",
        [req.agent.id, req.params.id]
      );

      const chambreRes = await client.query('SELECT * FROM chambres WHERE id = $1', [reservation.chambre_id]);
      const chambre = chambreRes.rows[0];
      const newOccupants = Math.max(0, chambre.nb_occupants_actuels - 1);

      // CORRECTION : Utiliser uniquement les statuts CDC
      let newStatut;
      if (!['travaux', 'bloquee', 'stock_etage'].includes(chambre.statut)) {
        newStatut = newOccupants === 0 ? 'libre'
          : newOccupants < chambre.capacite_max ? 'partielle' : 'occupee';
        await client.query(
          "UPDATE chambres SET nb_occupants_actuels = $1, statut = $2 WHERE id = $3",
          [newOccupants, newStatut, chambre.id]
        );
      } else {
        // Chambre en travaux/bloquée — décrémenter occupants sans changer statut
        await client.query(
          "UPDATE chambres SET nb_occupants_actuels = $1 WHERE id = $2",
          [newOccupants, chambre.id]
        );
      }

      await client.query("UPDATE clients SET statut = 'checkout' WHERE id = $1", [reservation.client_id]);

      // Créer tâche HK si chambre libérée
      if (newOccupants === 0) {
        await client.query(`
          INSERT INTO housekeeping (chambre_id, bloc_id, etage, date_affectation, type, statut, priorite)
          VALUES ($1, $2, $3, CURRENT_DATE, 'depart', 'a_faire', 'urgente')
        `, [chambre.id, chambre.bloc_id, chambre.etage]);
      }

      await logAction(req.agent.id, 'CHECKOUT', 'reservations', req.params.id, {}, req.ip);
      result = { success: true };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate solde
router.get('/:id/solde', requireAuth, async (req, res) => {
  try {
    const reservationRes = await db.get(`
      SELECT r.*, c.numero as chambre_numero, cl.nom, cl.prenom 
      FROM reservations r 
      JOIN chambres c ON r.chambre_id = c.id 
      JOIN clients cl ON r.client_id = cl.id
      WHERE r.id = $1
    `, [req.params.id]);
    
    if(!reservationRes) return res.status(404).json({error: 'Introuvable'});
    
    let end_date = reservationRes.date_depart ? new Date(reservationRes.date_depart) : new Date();
    const start_date = new Date(reservationRes.date_arrivee);
    // Remove time for calculation
    start_date.setHours(0,0,0,0);
    end_date.setHours(0,0,0,0);
    
    let nuits = Math.ceil((end_date - start_date) / 86400000);
    if (nuits < 1) nuits = 1;

    const total_nuit = nuits * (reservationRes.prix_nuit_applique || 0);
    const total_repas = nuits * (reservationRes.prix_repas_applique || 0);
    const total_theorique = total_nuit + total_repas;
    
    const encaissementsRes = await db.all("SELECT * FROM encaissements WHERE reservation_id = $1 AND annule = 0", [req.params.id]);
    let total_paye = 0;
    encaissementsRes.forEach(e => total_paye += parseFloat(e.montant));

    res.json({
      reservationId: reservationRes.id,
      chambre: reservationRes.chambre_numero,
      client: `${reservationRes.nom} ${reservationRes.prenom}`,
      nuits,
      total_nuit,
      total_repas,
      total_theorique,
      total_paye,
      solde: total_theorique - total_paye,
      mode_facturation: reservationRes.mode_facturation
    });

  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// POST /api/reservations/:id/checkout-anticipe — checkout anticipé avec calcul solde
router.post('/:id/checkout-anticipe', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  try {
    const { motif } = req.body;
    if (!motif?.trim()) return res.status(400).json({ error: 'Le motif est obligatoire (CDC §6.3)' });

    let solde = 0;
    let encaissementId = null;

    await db.transaction(async (client) => {
      const resData = await client.query("SELECT * FROM reservations WHERE id = $1", [req.params.id]);
      const reservation = resData.rows[0];
      if (!reservation) throw new Error('Réservation introuvable');
      if (reservation.statut !== 'checkin') throw new Error("Réservation non en cours");

      const dateCheckin = new Date(reservation.date_arrivee);
      const dateCheckout = new Date();
      let nuits = Math.ceil((dateCheckout - dateCheckin) / (1000 * 60 * 60 * 24));
      if (nuits <= 0) nuits = 1;

      const prixNuit = parseFloat(reservation.prix_nuit_applique) || 0;
      const prixRepas = parseFloat(reservation.prix_repas_applique) || 0;
      const montantDu = nuits * (prixNuit + prixRepas);

      const paidRes = await client.query(
        "SELECT COALESCE(SUM(montant), 0) as total FROM encaissements WHERE reservation_id = $1 AND annule = 0",
        [req.params.id]
      );
      const montantPaye = parseFloat(paidRes.rows[0].total) || 0;
      solde = Math.round((montantDu - montantPaye) * 100) / 100;

      await client.query(`
        UPDATE reservations SET statut = 'checkout', date_depart = NOW(),
          agent_checkout_id = $1, est_checkout_anticipe = 1, motif_checkout_anticipe = $2
        WHERE id = $3
      `, [req.agent.id, motif, req.params.id]);

      await client.query("UPDATE clients SET statut = 'checkout' WHERE id = $1", [reservation.client_id]);

      const chambreRes = await client.query("SELECT * FROM chambres WHERE id = $1", [reservation.chambre_id]);
      const room = chambreRes.rows[0];
      const newOcc = Math.max(0, room.nb_occupants_actuels - 1);

      if (!['travaux', 'bloquee', 'stock_etage'].includes(room.statut)) {
        const newStatut = newOcc === 0 ? 'libre' : newOcc < room.capacite_max ? 'partielle' : 'occupee';
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1, statut=$2 WHERE id=$3", [newOcc, newStatut, room.id]);
      } else {
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1 WHERE id=$2", [newOcc, room.id]);
      }

      if (newOcc === 0) {
        await client.query(`
          INSERT INTO housekeeping (chambre_id, bloc_id, etage, date_affectation, type, statut, priorite)
          VALUES ($1, $2, $3, CURRENT_DATE, 'depart', 'a_faire', 'urgente')
        `, [room.id, room.bloc_id, room.etage]);
      }

      await logAction(req.agent.id, 'CHECKOUT_ANTICIPE', 'reservations', req.params.id, { motif, nuits, montantDu, montantPaye, solde }, req.ip);
    });

    res.json({ success: true, solde, encaissement_id: encaissementId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reservations/:id/cancel-checkin
router.post('/:id/cancel-checkin', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { solde_perdu } = req.body;
    await db.transaction(async (client) => {
      const resData = await client.query("SELECT * FROM reservations WHERE id = $1", [req.params.id]);
      const reservation = resData.rows[0];
      if (!reservation) throw new Error('Réservation introuvable');
      
      await client.query(`
        UPDATE reservations SET statut = 'checkout', date_depart = NOW(),
          agent_checkout_id = $1, est_checkout_anticipe = 1, motif_checkout_anticipe = 'Clôturé par Administrateur (Impayé / Échappé)'
        WHERE id = $2
      `, [req.agent.id, req.params.id]);

      await client.query("UPDATE clients SET statut = 'checkout' WHERE id = $1", [reservation.client_id]);

      const chambreRes = await client.query("SELECT * FROM chambres WHERE id = $1", [reservation.chambre_id]);
      const room = chambreRes.rows[0];
      const newOcc = Math.max(0, room.nb_occupants_actuels - 1);

      if (!['travaux', 'bloquee', 'stock_etage'].includes(room.statut)) {
        const newStatut = newOcc === 0 ? 'libre' : newOcc < room.capacite_max ? 'partielle' : 'occupee';
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1, statut=$2 WHERE id=$3", [newOcc, newStatut, room.id]);
      } else {
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1 WHERE id=$2", [newOcc, room.id]);
      }

      if (newOcc === 0) {
        await client.query(`
          INSERT INTO housekeeping (chambre_id, bloc_id, etage, date_affectation, type, statut, priorite)
          VALUES ($1, $2, $3, CURRENT_DATE, 'depart', 'a_faire', 'urgente')
        `, [room.id, room.bloc_id, room.etage]);
      }

      const sessionCaisse = await client.query("SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'", [req.agent.id]);
      
      await client.query(`
        INSERT INTO encaissements (reservation_id, client_id, session_caisse_id, agent_id, montant, type_paiement, formule, description, annule)
        VALUES ($1, $2, $3, $4, 0, 'especes', $5, $6, 1)
      `, [
         req.params.id, 
         reservation.client_id, 
         sessionCaisse.rows[0]?.id || null, 
         req.agent.id, 
         reservation.formule || 'N/A', 
         `ANNULATION (Impayé résiduel: ${solde_perdu || 0} DZD) - Clôture Admin`
      ]);
      
      const { logAction } = require('../middleware/auditLogger.cjs');
      await logAction(req.agent.id, 'CANCEL_CHECKIN_ADMIN', 'reservations', req.params.id, { perte: solde_perdu }, req.ip);
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
