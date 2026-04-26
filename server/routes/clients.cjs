'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { statut, search } = req.query;
    let query = "SELECT * FROM clients WHERE 1=1";
    let params = [];
    if (statut) {
      params.push(statut);
      query += ` AND statut = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nom ILIKE $${params.length} OR prenom ILIKE $${params.length} OR nin ILIKE $${params.length} OR num_piece ILIKE $${params.length})`;
    }
    query += " ORDER BY created_at DESC";
    const clients = await db.all(query, params);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    let authAgentId = null;
    if (req.headers.authorization) {
      // Optional check if authenticated
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'votre-secret-local-dev');
        authAgentId = decoded.id;
      } catch(e) {}
    }

    // NIN verify
    if (data.nin) {
      const existing = await db.get("SELECT id FROM clients WHERE nin = $1", [data.nin]);
      if (existing) return res.status(400).json({ error: 'NIN déjà utilisé' });
    }

    const resDb = await db.run(`
      INSERT INTO clients (
        nom, prenom, date_naissance, lieu_naissance, adresse_residence, sexe,
        nationalite, est_etranger, nin, type_piece, num_piece, groupe_sanguin,
        formule, photo_selfie, photo_piece_recto, photo_piece_verso, est_mineur,
        tuteur_nom, tuteur_contact, statut
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id
    `, [
      data.nom, data.prenom, data.date_naissance || null, data.lieu_naissance,
      data.adresse_residence, data.sexe, data.nationalite || 'DZ', data.est_etranger || 0,
      data.nin || null, data.type_piece || null, data.num_piece || null, data.groupe_sanguin || 'ND',
      data.formule, data.photo_selfie || null, data.photo_piece_recto || null, data.photo_piece_verso || null,
      data.est_mineur || 0, data.tuteur_nom || null, data.tuteur_contact || null, data.statut || 'en_attente'
    ]);

    await logAction(authAgentId, 'INSCRIPTION_CLIENT', 'clients', resDb.lastId, data, req.ip);

    res.json({ success: true, id: resDb.lastId, dossier: `NAPOLI-2026-${String(resDb.lastId).padStart(5, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
