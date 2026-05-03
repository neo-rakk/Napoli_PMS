'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

// GET /api/encaissements — historique avec filtres date
router.get('/', requireAuth, async (req, res) => {
  try {
    const { date_debut, date_fin, reservation_id } = req.query;
    let query = `
      SELECT e.*, a.nom as agent_nom, a.prenom as agent_prenom,
             c.nom as client_nom, c.prenom as client_prenom
      FROM encaissements e
      LEFT JOIN agents a ON e.agent_id = a.id
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (date_debut) { params.push(date_debut); query += ` AND DATE(e.created_at) >= $${params.length}`; }
    if (date_fin) { params.push(date_fin); query += ` AND DATE(e.created_at) <= $${params.length}`; }
    if (reservation_id) { params.push(reservation_id); query += ` AND e.reservation_id = $${params.length}`; }
    query += " ORDER BY e.created_at DESC LIMIT 500";
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/encaissements — nouvel encaissement individuel
router.post('/', requireAuth, requireRole('accueil', 'admin', 'caisse'), async (req, res) => {
  try {
    const { reservation_id, client_id, montant, type_paiement, formule, description, est_checkout_anticipe } = req.body;
    if (!montant || montant <= 0) return res.status(400).json({ error: 'Montant invalide' });

    // Vérifier session caisse ouverte
    const session = await db.get(
      "SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'",
      [req.agent.id]
    );
    if (!session) return res.status(400).json({ error: 'Aucune session de caisse ouverte. Ouvrez une session avant d\'encaisser.' });

    const result = await db.run(`
      INSERT INTO encaissements 
        (reservation_id, client_id, agent_id, session_caisse_id, montant, type_paiement, formule, description, est_checkout_anticipe)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      reservation_id || null, client_id || null, req.agent.id, session.id,
      montant, type_paiement || 'especes', formule || 'N/A',
      description || null, est_checkout_anticipe || 0
    ]);

    await logAction(req.agent.id, 'ENCAISSEMENT', 'encaissements', result.lastId, { montant, type_paiement });
    res.status(201).json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/encaissements/groupe — encaissement collectif groupe
router.post('/groupe', requireAuth, requireRole('accueil', 'admin', 'caisse'), async (req, res) => {
  try {
    const { groupe_id, montant, type_paiement } = req.body;
    if (!groupe_id || !montant) return res.status(400).json({ error: 'groupe_id et montant obligatoires' });

    const session = await db.get(
      "SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'",
      [req.agent.id]
    );
    if (!session) return res.status(400).json({ error: 'Session de caisse requise' });

    const groupe = await db.get("SELECT * FROM groupes WHERE id = $1", [groupe_id]);
    if (!groupe) return res.status(404).json({ error: 'Groupe introuvable' });

    const result = await db.run(`
      INSERT INTO encaissements (groupe_id, agent_id, session_caisse_id, montant, type_paiement, formule, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [
      groupe_id, req.agent.id, session.id, montant,
      type_paiement || 'virement',
      groupe.formule_groupe || 'PC',
      `Facturation collective — ${groupe.nom}`
    ]);

    await logAction(req.agent.id, 'FACTURATION_GROUPE', 'encaissements', result.lastId, { groupe_id, montant });
    res.status(201).json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/encaissements/pending — en attente de paiement
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const result = await db.all(`
      SELECT r.id as reservation_id, c.nom, c.prenom, c.num_piece, c.nin, c.est_etranger, c.photo_selfie, c.groupe_sanguin, c.est_mineur, ch.numero as chambre,
             r.date_arrivee, r.date_checkout_prevu, r.formule, r.mode_facturation,
             r.prix_nuit_applique, r.prix_repas_applique, r.statut,
             COALESCE((SELECT SUM(e.montant) FROM encaissements e WHERE e.reservation_id = r.id AND e.annule = 0), 0) as deja_paye
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN chambres ch ON r.chambre_id = ch.id
      WHERE r.statut = 'checkin' AND r.mode_facturation = 'direct'
      ORDER BY r.date_arrivee DESC
    `);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/encaissements/journal — journal du jour
router.get('/journal', requireAuth, async (req, res) => {
  try {
    const query = req.agent.role === 'admin'
      ? `SELECT e.*, a.nom as agent_nom, a.prenom as agent_prenom, c.nom as client_nom, c.prenom as client_prenom, ch.numero as chambre_numero 
         FROM encaissements e 
         JOIN agents a ON e.agent_id = a.id 
         LEFT JOIN clients c ON e.client_id = c.id
         LEFT JOIN reservations r ON e.reservation_id = r.id
         LEFT JOIN chambres ch ON r.chambre_id = ch.id
         WHERE DATE(e.created_at) = CURRENT_DATE AND e.annule = 0 
         ORDER BY e.created_at DESC`
      : `SELECT e.*, a.nom as agent_nom, a.prenom as agent_prenom, c.nom as client_nom, c.prenom as client_prenom, ch.numero as chambre_numero 
         FROM encaissements e 
         JOIN agents a ON e.agent_id = a.id 
         LEFT JOIN clients c ON e.client_id = c.id
         LEFT JOIN reservations r ON e.reservation_id = r.id
         LEFT JOIN chambres ch ON r.chambre_id = ch.id
         WHERE DATE(e.created_at) = CURRENT_DATE AND e.agent_id = $1 AND e.annule = 0 
         ORDER BY e.created_at DESC`;
    const params = req.agent.role === 'admin' ? [] : [req.agent.id];
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/encaissements/:id — annuler (admin uniquement)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { motif_annulation } = req.body;
    await db.run(
      "UPDATE encaissements SET annule = 1, annule_par = $1, annule_le = NOW(), motif_annulation = $2 WHERE id = $3",
      [req.agent.id, motif_annulation || 'Annulé par admin', req.params.id]
    );
    await logAction(req.agent.id, 'ANNULATION_ENCAISSEMENT', 'encaissements', req.params.id, { motif_annulation });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route /pay conservée pour compatibilité POS
router.post('/refund', requireAuth, async (req, res) => {
  const { reservation_id, montant, methode } = req.body;
  if (!reservation_id || !montant) return res.status(400).json({ error: 'Données invalides' });
  try {
    const sessionRes = await db.query("SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'", [req.agent.id]);
    const session = sessionRes.rows[0];
    if (!session) return res.status(400).json({ error: "Aucune session de caisse ouverte." });
    
    const resData = await db.query("SELECT client_id, formule FROM reservations WHERE id = $1", [reservation_id]);
    const reservation = resData.rows[0];
    
    const typeP = methode === 'cash' ? 'especes' : 'carte';
    const amount = -Math.abs(montant);
    const result = await db.query(
      "INSERT INTO encaissements (reservation_id, client_id, agent_id, session_caisse_id, montant, type_paiement, formule, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [reservation_id, reservation?.client_id, req.agent.id, session.id, amount, typeP, reservation?.formule || 'N/A', 'Remboursement (Check-Out Anticipé)']
    );
    
    // Update session_caisse totals
    const colMap = {
      'especes': 'total_especes',
      'virement': 'total_virement',
      'cheque': 'total_cheques'
    };
    const col = colMap[typeP] || 'total_especes';
    await db.query(`UPDATE sessions_caisse SET ${col} = COALESCE(${col},0) + $1, total_general = COALESCE(total_general,0) + $1 WHERE id = $2`, [amount, session.id]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/pay', requireAuth, async (req, res) => {
  const { reservation_id, montant, methode } = req.body;
  if (!reservation_id || !montant) return res.status(400).json({ error: 'Données invalides' });
  try {
    const session = await db.get("SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'", [req.agent.id]);
    const result = await db.run(
      "INSERT INTO encaissements (reservation_id, agent_id, session_caisse_id, montant, type_paiement, formule) VALUES ($1, $2, $3, $4, $5, 'N/A') RETURNING id",
      [reservation_id, req.agent.id, session?.id || null, montant, methode === 'cash' ? 'especes' : 'carte']
    );
    res.json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
