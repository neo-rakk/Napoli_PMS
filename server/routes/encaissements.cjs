'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

router.get('/pending', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT r.id as reservation_id, c.nom, c.prenom, ch.numero as chambre, r.date_arrivee, r.date_depart,
             r.prix_nuit_applique, r.prix_repas_applique, r.statut, r.mode_facturation,
             (SELECT COALESCE(SUM(montant), 0) FROM encaissements WHERE reservation_id = r.id AND annule = 0) as deja_paye
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN chambres ch ON r.chambre_id = ch.id
      WHERE r.statut IN ('checkin', 'checkout') AND r.mode_facturation = 'direct'
    `;
    const result = await db.all(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journal', requireAuth, async (req, res) => {
  // Liste des encaissements du jour pour l'agent (ou tous si chef)
  try {
    const isChef = req.agent.role === 'admin' || req.agent.role === 'chef_reception'; // Add chef if needed
    let query = `
      SELECT e.*, r.id as reservation_id, c.nom as client_nom, c.prenom as client_prenom,
             a.prenom as agent_prenom, a.nom as agent_nom
      FROM encaissements e
      JOIN reservations r ON e.reservation_id = r.id
      JOIN clients c ON r.client_id = c.id
      JOIN agents a ON e.agent_id = a.id
      WHERE DATE(e.created_at) = CURRENT_DATE
    `;
    let params = [];
    if (!isChef) {
      query += ` AND e.agent_id = $1`;
      params.push(req.agent.id);
    }
    query += " ORDER BY e.created_at DESC";
    const result = await db.all(query, params);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/pay', requireAuth, async (req, res) => {
  const { reservation_id, montant, methode } = req.body;
  if(!reservation_id || !montant || !methode) return res.status(400).json({error: 'Données invalides'});

  try {
    // Generate valid reference
    const now = new Date();
    const ref = `REC-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*10000)}`;

    const resDb = await db.run(`
      INSERT INTO encaissements (reservation_id, agent_id, montant, methode, reference)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, reference
    `, [reservation_id, req.agent.id, montant, methode, ref]);

    await logAction(req.agent.id, 'ENCAISSEMENT', 'encaissements', resDb.lastId, { montant, methode, ref }, req.ip);

    res.json({ success: true, id: resDb.lastId, reference: ref });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
