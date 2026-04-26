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

router.post('/checkin', requireAuth, requireRole('accueil', 'admin'), async (req, res) => {
  const { 
    client_id, chambre_id, date_checkout_prevu, formule, mode_facturation,
    grand_compte_id, bon_commande_id 
  } = req.body;

  if (!client_id || !chambre_id || !date_checkout_prevu || !formule || !mode_facturation) {
    return res.status(400).json({ error: 'Données manquantes pour le check-in' });
  }

  try {
    let result = {};
    await db.transaction(async (client) => {
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
    const reservationId = req.params.id;
    let result = {};
    
    await db.transaction(async (client) => {
      const resData = await client.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
      const reservation = resData.rows[0];
      if (!reservation) throw new Error("Réservation introuvable");
      if (reservation.statut !== 'checkin') throw new Error("Cette réservation n'est pas au statut check-in");

      // Set checkout date and status
      await client.query("UPDATE reservations SET date_depart = NOW(), statut = 'checkout' WHERE id = $1", [reservationId]);
      
      // Calculate remaining occupants and new room status
      const chambreRes = await client.query('SELECT * FROM chambres WHERE id = $1', [reservation.chambre_id]);
      const chambre = chambreRes.rows[0];
      
      const newOccupants = Math.max(0, chambre.nb_occupants_actuels - 1);
      
      // Update chambre status => IF checking out, room should become 'en_nettoyage'
      let finalStatus = chambre.statut;
      if (newOccupants === 0) {
        finalStatus = 'sale';
      } else {
        // Still occupied
        finalStatus = calculerStatutChambre(newOccupants, chambre.capacite_max);
      }
      await client.query("UPDATE chambres SET nb_occupants_actuels = $1, statut = $2 WHERE id = $3", [newOccupants, finalStatus, chambre.id]);

      await client.query("UPDATE clients SET statut = 'checkout' WHERE id = $1", [reservation.client_id]);

      await logAction(req.agent.id, 'CHECKOUT', 'reservations', reservationId, {}, req.ip);

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

    const total_theorique = nuits * ((reservationRes.prix_nuit_applique || 0) + (reservationRes.prix_repas_applique || 0));
    
    const encaissementsRes = await db.all("SELECT * FROM encaissements WHERE reservation_id = $1 AND annule = 0", [req.params.id]);
    let total_paye = 0;
    encaissementsRes.forEach(e => total_paye += parseFloat(e.montant));

    res.json({
      reservationId: reservationRes.id,
      chambre: reservationRes.chambre_numero,
      client: `${reservationRes.nom} ${reservationRes.prenom}`,
      nuits,
      total_theorique,
      total_paye,
      solde: total_theorique - total_paye,
      mode_facturation: reservationRes.mode_facturation
    });

  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
