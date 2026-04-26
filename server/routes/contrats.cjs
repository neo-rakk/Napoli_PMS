'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/actif/:gc_id', requireAuth, async (req, res) => {
  try {
    const contrat = await db.get(
      "SELECT * FROM contrats WHERE grand_compte_id = $1 AND actif = 1 AND date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE", 
      [req.params.gc_id]
    );
    res.json(contrat || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
