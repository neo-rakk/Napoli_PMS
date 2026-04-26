'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const groupes = await db.all("SELECT * FROM groupes ORDER BY created_at DESC");
    res.json(groupes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
