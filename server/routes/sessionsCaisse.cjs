'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

// GET /api/sessions-caisse/statut — statut session courante de l'agent
router.get('/statut', requireAuth, async (req, res) => {
  try {
    const session = await db.get(
      "SELECT * FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte' ORDER BY date_ouverture DESC LIMIT 1",
      [req.agent.id]
    );
    res.json({ session: session || null, ouverte: !!session });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/sessions-caisse/ouvrir — ouvrir une session
router.post('/ouvrir', requireAuth, async (req, res) => {
  try {
    const existing = await db.get(
      "SELECT id FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'",
      [req.agent.id]
    );
    if (existing) return res.status(400).json({ error: 'Une session est déjà ouverte pour cet agent' });
    
    const { montant_ouverture } = req.body;
    const result = await db.run(
      "INSERT INTO sessions_caisse (agent_id, montant_ouverture, statut) VALUES ($1, $2, 'ouverte') RETURNING id",
      [req.agent.id, montant_ouverture || 0]
    );
    await logAction(req.agent.id, 'OUVERTURE_CAISSE', 'sessions_caisse', result.lastId, {});
    res.status(201).json({ success: true, session_id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/sessions-caisse/cloturer — clôturer la session courante
router.post('/cloturer', requireAuth, async (req, res) => {
  try {
    const session = await db.get(
      "SELECT * FROM sessions_caisse WHERE agent_id = $1 AND statut = 'ouverte'",
      [req.agent.id]
    );
    if (!session) return res.status(404).json({ error: 'Aucune session ouverte' });

    // Calcul automatique des totaux
    const totaux = await db.get(`
      SELECT
        COALESCE(SUM(CASE WHEN type_paiement = 'especes' THEN montant ELSE 0 END), 0) as total_especes,
        COALESCE(SUM(CASE WHEN type_paiement = 'virement' THEN montant ELSE 0 END), 0) as total_virement,
        COALESCE(SUM(CASE WHEN type_paiement = 'cheque' THEN montant ELSE 0 END), 0) as total_cheques,
        COALESCE(SUM(montant), 0) as total_general
      FROM encaissements
      WHERE session_caisse_id = $1 AND annule = 0
    `, [session.id]);

    const { montant_cloture } = req.body;
    await db.run(`
      UPDATE sessions_caisse
      SET statut = 'cloturee', date_cloture = NOW(),
          montant_cloture = $1, total_especes = $2,
          total_virement = $3, total_cheques = $4, total_general = $5
      WHERE id = $6
    `, [
      montant_cloture || totaux.total_especes,
      totaux.total_especes, totaux.total_virement,
      totaux.total_cheques, totaux.total_general,
      session.id
    ]);
    await logAction(req.agent.id, 'FERMETURE_CAISSE', 'sessions_caisse', session.id, totaux);
    res.json({ success: true, totaux });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sessions-caisse — historique des sessions
router.get('/', requireAuth, async (req, res) => {
  try {
    const sessions = await db.all(`
      SELECT s.*, a.nom, a.prenom FROM sessions_caisse s
      JOIN agents a ON s.agent_id = a.id
      ORDER BY s.date_ouverture DESC LIMIT 100
    `);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
