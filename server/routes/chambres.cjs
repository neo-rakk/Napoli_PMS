'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { statut, bloc_id, type } = req.query;
    let query = "SELECT c.*, b.nom as bloc_nom FROM chambres c LEFT JOIN blocs b ON c.bloc_id = b.id WHERE 1=1";
    let params = [];
    if (statut) {
      params.push(statut);
      query += ` AND c.statut = $${params.length}`;
    }
    if (bloc_id) {
      params.push(bloc_id);
      query += ` AND c.bloc_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND c.type = $${params.length}`;
    }
    query += " ORDER BY b.nom, c.etage, c.numero";
    const chambres = await db.all(query, params);
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/disponibles', requireAuth, async (req, res) => {
  try {
    const chambres = await db.all("SELECT c.*, b.nom as bloc_nom FROM chambres c LEFT JOIN blocs b ON c.bloc_id = b.id WHERE c.statut IN ('libre', 'partielle') ORDER BY b.nom, c.etage, c.numero");
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/statut', requireAuth, async (req, res) => {
  try {
    const { statut } = req.body;
    if (!statut) return res.status(400).json({ error: 'Statut requis' });
    
    // Some basic validation: don't allow changing to 'libre' if nb_occupants > 0
    const chambre = await db.get("SELECT * FROM chambres WHERE id = $1", [req.params.id]);
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });
    
    if (statut === 'libre' && chambre.nb_occupants_actuels > 0) {
      return res.status(400).json({ error: 'La chambre n\'est pas vide, elle ne peut pas être libre.' });
    }
    
    await db.query("UPDATE chambres SET statut = $1 WHERE id = $2", [statut, req.params.id]);
    res.json({ success: true, statut });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
