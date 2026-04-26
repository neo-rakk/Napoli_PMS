'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

// Init schema
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tarifs_saisons (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        date_debut DATE,
        date_fin DATE,
        multiplicateur REAL DEFAULT 1.0,
        actif INTEGER DEFAULT 1
      )
    `);
  } catch (e) {
    console.error("Init Tarifs DB Err:", e.message);
  }
})();

router.get('/actifs', requireAuth, async (req, res) => {
  try {
    const tarifs = await db.all("SELECT * FROM tarifs WHERE actif = 1");
    // Also fetch active seasons
    const saisons = await db.all("SELECT * FROM tarifs_saisons WHERE actif = 1 ORDER BY date_debut ASC");
    res.json({ tarifs, saisons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, type_chambre_id, formule, prix_base } = req.body;
    await db.query(`
      INSERT INTO tarifs (nom, type_chambre_id, formule, prix_base, actif)
      VALUES ($1, $2, $3, $4, 1)
    `, [nom, type_chambre_id, formule, prix_base]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/saisons', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, date_debut, date_fin, multiplicateur } = req.body;
    await db.query(`
      INSERT INTO tarifs_saisons (nom, date_debut, date_fin, multiplicateur, actif)
      VALUES ($1, $2, $3, $4, 1)
    `, [nom, date_debut, date_fin, multiplicateur]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
