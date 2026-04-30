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

// GET /api/groupes/:id — détail groupe + membres
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const groupe = await db.get("SELECT * FROM groupes WHERE id = $1", [req.params.id]);
    if (!groupe) return res.status(404).json({ error: 'Groupe introuvable' });
    const membres = await db.all("SELECT * FROM clients WHERE groupe_id = $1 ORDER BY nom", [req.params.id]);
    res.json({ ...groupe, membres });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/groupes/:id — modifier un groupe
router.put('/:id', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { nom, sport, pays, responsable_nom, responsable_contact, nb_membres_prevus, formule_groupe, date_arrivee, date_depart, statut, notes } = req.body;
    await db.run(`
      UPDATE groupes SET nom=$1, sport=$2, pays=$3, responsable_nom=$4, responsable_contact=$5,
        nb_membres_prevus=$6, formule_groupe=$7, date_arrivee=$8, date_depart=$9, statut=$10, notes=$11
      WHERE id=$12
    `, [nom, sport, pays, responsable_nom, responsable_contact, nb_membres_prevus, formule_groupe, date_arrivee, date_depart, statut, notes, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groupes/:id/membres — ajouter un client au groupe
router.post('/:id/membres', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { client_id } = req.body;
    await db.run("UPDATE clients SET groupe_id = $1 WHERE id = $2", [req.params.id, client_id]);
    await db.run("UPDATE groupes SET nb_membres_actuels = nb_membres_actuels + 1 WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groupes/:id/membres/:clientId — retirer un membre
router.delete('/:id/membres/:clientId', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    await db.run("UPDATE clients SET groupe_id = NULL WHERE id = $1 AND groupe_id = $2", [req.params.clientId, req.params.id]);
    await db.run("UPDATE groupes SET nb_membres_actuels = GREATEST(0, nb_membres_actuels - 1) WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groupes/:id/checkout — checkout collectif
router.post('/:id/checkout', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    await db.transaction(async (client) => {
      // Clôturer toutes les réservations actives du groupe
      const reservations = await client.query(
        "SELECT * FROM reservations WHERE groupe_id = $1 AND statut = 'checkin'",
        [req.params.id]
      );
      for (const r of reservations.rows) {
        await client.query("UPDATE reservations SET statut = 'checkout', date_depart = NOW() WHERE id = $1", [r.id]);
        const chambreRes = await client.query("SELECT * FROM chambres WHERE id = $1", [r.chambre_id]);
        const chambre = chambreRes.rows[0];
        const newOcc = Math.max(0, chambre.nb_occupants_actuels - 1);
        const newStatut = newOcc === 0 ? 'libre' : newOcc < chambre.capacite_max ? 'partielle' : 'occupee';
        await client.query("UPDATE chambres SET nb_occupants_actuels=$1, statut=$2 WHERE id=$3", [newOcc, newStatut, chambre.id]);
      }
      // CORRECTION : statut 'checkout' (pas 'archive')
      await client.query("UPDATE groupes SET statut = 'checkout' WHERE id = $1", [req.params.id]);
      await client.query("UPDATE clients SET statut = 'checkout' WHERE groupe_id = $1", [req.params.id]);
    });
    const { logAction } = require('../middleware/auditLogger.cjs');
    await logAction(req.agent.id, 'CHECKOUT_GROUPE', 'groupes', req.params.id, {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
