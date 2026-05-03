'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

// GET /api/clients/check-nin/:nin — vérifier doublon NIN
router.get('/check-nin/:nin', async (req, res) => {
  try {
    const client = await db.get("SELECT id FROM clients WHERE nin = $1", [req.params.nin]);
    res.json({ exists: !!client });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/check-piece/:num — vérifier doublon pièce étrangère
router.get('/check-piece/:num', async (req, res) => {
  try {
    const client = await db.get("SELECT id FROM clients WHERE num_piece = $1", [req.params.num]);
    res.json({ exists: !!client });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/mineurs — liste clients mineurs
router.get('/mineurs', requireAuth, async (req, res) => {
  try {
    const mineurs = await db.all("SELECT * FROM clients WHERE est_mineur = 1 ORDER BY nom");
    res.json(mineurs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id — détail client
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const client = await db.get("SELECT * FROM clients WHERE id = $1", [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client introuvable' });
    res.json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clients/:id — modifier client
router.put('/:id', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { nom, prenom, date_naissance, lieu_naissance, adresse_residence, sexe, groupe_sanguin, formule, tuteur_nom, tuteur_contact } = req.body;
    await db.run(`
      UPDATE clients SET nom=$1, prenom=$2, date_naissance=$3, lieu_naissance=$4,
        adresse_residence=$5, sexe=$6, groupe_sanguin=$7, formule=$8, tuteur_nom=$9, tuteur_contact=$10
      WHERE id=$11
    `, [nom, prenom, date_naissance, lieu_naissance, adresse_residence, sexe, groupe_sanguin, formule, tuteur_nom, tuteur_contact, req.params.id]);
    await logAction(req.agent.id, 'MODIFICATION_CLIENT', 'clients', req.params.id, req.body, req.ip);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { statut, search, id, groupe_id } = req.query;
    let query = "SELECT * FROM clients WHERE 1=1";
    const params = [];

    if (id) { params.push(id); query += ` AND id = $${params.length}`; }
    if (statut) { params.push(statut); query += ` AND statut = $${params.length}`; }
    if (groupe_id) { params.push(groupe_id); query += ` AND groupe_id = $${params.length}`; }
    if (search) {
      const idx = params.push(`%${search}%`);
      query += ` AND (nom ILIKE $${idx} OR prenom ILIKE $${idx} OR nin ILIKE $${idx} OR num_piece ILIKE $${idx})`;
    }

    query += " ORDER BY created_at DESC LIMIT 200";
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
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
        authAgentId = decoded.id;
      } catch(e) {}
    }

    if (!data.is_quick_create || !authAgentId) {
      if (data.est_etranger === 0 || data.est_etranger === '0' || data.est_etranger === false) {
        if (!data.nin || !/^\\d{18}$/.test(data.nin)) {
          return res.status(400).json({ error: 'Le NIN doit contenir exactement 18 chiffres numériques' });
        }
      } else {
        if (!data.num_piece || data.num_piece.trim().length < 5) {
          return res.status(400).json({ error: 'Le numéro de pièce doit contenir au moins 5 caractères' });
        }
      }
    }

    const dob = data.date_naissance ? new Date(data.date_naissance) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 18;
    const estMineur = age < 18;
    if (estMineur && (!data.tuteur_nom?.trim() || !data.tuteur_contact?.trim())) {
      return res.status(400).json({ error: 'Tuteur obligatoire pour les mineurs' });
    }
    data.est_mineur = estMineur ? 1 : 0;

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
      data.adresse_residence, data.sexe, data.nationalite || 'DZ', data.est_etranger ? 1 : 0,
      data.nin || null, data.type_piece || null, data.num_piece || null, data.groupe_sanguin || 'ND',
      data.formule, data.photo_selfie || null, data.photo_piece_recto || null, data.photo_piece_verso || null,
      data.est_mineur, data.tuteur_nom || null, data.tuteur_contact || null, data.statut || 'en_attente'
    ]);

    await logAction(authAgentId, 'INSCRIPTION_CLIENT', 'clients', resDb.lastId, data, req.ip);

    res.json({ success: true, id: resDb.lastId, dossier: `NAPOLI-2026-${String(resDb.lastId).padStart(5, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
