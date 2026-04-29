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

router.post('/', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { nom, code, sport, pays, responsable_nom, responsable_contact, nb_membres_prevus, formule_groupe, date_arrivee, date_depart, notes } = req.body;
    await db.query(`
      INSERT INTO groupes 
      (nom, code, sport, pays, responsable_nom, responsable_contact, nb_membres_prevus, formule_groupe, date_arrivee, date_depart, notes, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'en_attente')
    `, [
      nom, code, 
      sport || null, 
      pays || null, 
      responsable_nom || null, 
      responsable_contact || null, 
      nb_membres_prevus || 0, 
      formule_groupe || null, 
      date_arrivee || null, 
      date_depart || null, 
      notes || null
    ]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
