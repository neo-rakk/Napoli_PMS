'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const comptes = await db.all("SELECT * FROM grands_comptes ORDER BY nom");
    res.json(comptes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les BDC actifs pour un compte
router.get('/:id/bons-commande/actifs', requireAuth, async (req, res) => {
  try {
    const bdcs = await db.all("SELECT * FROM bons_de_commande WHERE grand_compte_id = $1 AND statut = 'actif'", [req.params.id]);
    res.json(bdcs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
