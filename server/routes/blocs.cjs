'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

// GET /api/blocs — liste tous les blocs avec stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const blocs = await db.all(`
      SELECT b.*,
        COUNT(c.id) as nb_chambres,
        COUNT(DISTINCT c.etage) as nb_etages_reels,
        SUM(CASE WHEN c.statut = 'occupee' THEN 1 ELSE 0 END) as nb_occupees,
        SUM(CASE WHEN c.statut = 'partielle' THEN 1 ELSE 0 END) as nb_partielles,
        SUM(CASE WHEN c.statut = 'libre' THEN 1 ELSE 0 END) as nb_libres
      FROM blocs b
      LEFT JOIN chambres c ON c.bloc_id = b.id
      GROUP BY b.id
      ORDER BY b.code
    `);
    res.json(blocs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/blocs — créer un bloc (admin)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, code, nb_etages, description } = req.body;
    if (!nom || !code) return res.status(400).json({ error: 'nom et code obligatoires' });
    const result = await db.run(
      "INSERT INTO blocs (nom, code, nb_etages, description) VALUES ($1, $2, $3, $4) RETURNING id",
      [nom, code, nb_etages || 1, description || null]
    );
    await logAction(req.agent.id, 'CREATION_BLOC', 'blocs', result.lastId, { nom, code });
    res.status(201).json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/blocs/:id — modifier un bloc
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, code, nb_etages, description, actif } = req.body;
    await db.run(
      "UPDATE blocs SET nom=$1, code=$2, nb_etages=$3, description=$4, actif=$5 WHERE id=$6",
      [nom, code, nb_etages, description, actif ?? 1, req.params.id]
    );
    await logAction(req.agent.id, 'MODIFICATION_BLOC', 'blocs', req.params.id, req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/blocs/:id — supprimer un bloc complètement
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.transaction(async (client) => {
       await client.query("DELETE FROM chambres WHERE bloc_id = $1", [req.params.id]);
       await client.query("DELETE FROM blocs WHERE id = $1", [req.params.id]);
    });
    const { logAction } = require('../middleware/auditLogger.cjs');
    await logAction(req.agent.id, 'SUPPRESSION_BLOC', 'blocs', req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('violates foreign key constraint')) {
       return res.status(400).json({ error: 'Le bloc ou ses chambres sont liés à d\'autres enregistrements.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blocs/:id/stats — statistiques d'un bloc
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT b.*,
        COUNT(c.id) as nb_chambres,
        SUM(CASE WHEN c.statut = 'occupee' THEN 1 ELSE 0 END) as occupees,
        SUM(CASE WHEN c.statut = 'partielle' THEN 1 ELSE 0 END) as partielles,
        SUM(CASE WHEN c.statut = 'libre' THEN 1 ELSE 0 END) as libres,
        SUM(CASE WHEN c.statut = 'travaux' THEN 1 ELSE 0 END) as travaux,
        SUM(c.nb_occupants_actuels) as total_occupants
      FROM blocs b
      LEFT JOIN chambres c ON c.bloc_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [req.params.id]);
    if (!stats) return res.status(404).json({ error: 'Bloc introuvable' });
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/blocs/:id/chambres/generate — génération automatique de chambres
router.post('/:id/chambres/generate', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nb_etages, chambres_par_etage, type_defaut, capacite_defaut } = req.body;
    const bloc = await db.get("SELECT * FROM blocs WHERE id = $1", [req.params.id]);
    if (!bloc) return res.status(404).json({ error: 'Bloc introuvable' });
    
    let created = 0;
    for (let etage = 1; etage <= (nb_etages || bloc.nb_etages); etage++) {
      for (let i = 1; i <= (chambres_par_etage || 10); i++) {
        const numero = `${bloc.code}${etage}${i.toString().padStart(2, '0')}`;
        try {
          await db.run(
            "INSERT INTO chambres (numero, bloc, bloc_id, etage, type, capacite_max, statut) VALUES ($1, $2, $3, $4, $5, $6, 'libre')",
            [numero, bloc.code, bloc.id, etage, type_defaut || 'Single', capacite_defaut || 1]
          );
          created++;
        } catch (e) { /* Ignore doublons (ON CONFLICT) */ }
      }
    }
    res.json({ success: true, created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
