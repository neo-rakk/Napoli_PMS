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

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, nif, rc, adresse, telephone, email, contact_nom, contact_telephone } = req.body;
    await db.query(`
      INSERT INTO grands_comptes (nom, nif, rc, adresse, telephone, email, contact_nom, contact_telephone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [nom, nif, rc, adresse, telephone, email, contact_nom, contact_telephone]);
    res.json({ success: true });
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

router.get('/:id/bons-commande', requireAuth, async (req, res) => {
  try {
    const bdcs = await db.all("SELECT * FROM bons_de_commande WHERE grand_compte_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(bdcs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/bons-commande', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { reference_interne, montant_plafond, statut } = req.body;
    await db.query(`
      INSERT INTO bons_de_commande (grand_compte_id, reference_interne, montant_plafond, statut, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, reference_interne, montant_plafond || 0, statut || 'actif', req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/contrats', requireAuth, async (req, res) => {
  try {
    const contrats = await db.all("SELECT * FROM contrats WHERE grand_compte_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(contrats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/contrats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { reference, date_debut, date_fin, remise_percent, actif } = req.body;
    await db.query(`
      INSERT INTO contrats (grand_compte_id, reference, date_debut, date_fin, remise_percent, actif, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [req.params.id, reference, date_debut, date_fin, remise_percent || 0, actif || 1, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
