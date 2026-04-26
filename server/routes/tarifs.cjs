'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/actifs', requireAuth, async (req, res) => {
  try {
    const tarifs = await db.all("SELECT * FROM tarifs WHERE actif = 1");
    res.json(tarifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
