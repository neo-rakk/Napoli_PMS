'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'votre-secret-local-dev';
// if (!JWT_SECRET) throw new Error('[FATAL] JWT_SECRET manquant');

// Liste des agents (public pour le login PIN, filtré pour admin)
router.get('/', async (req, res) => {
  try {
    const agents = await db.all("SELECT id, ('AGT-' || LPAD(id::text, 3, '0')) as code FROM agents WHERE actif = 1 ORDER BY id");
    // Ne retourner QUE id et code — pas de rôle, pas de nom
    res.json(agents.map(a => ({ id: a.id, code: a.code })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login PIN Agent Réception
router.post('/auth/pin', async (req, res) => {
  const { agentId, pin } = req.body;
  if (!agentId || !pin) return res.status(400).json({ error: 'agentId et pin requis' });

  try {
    const agent = await db.get("SELECT * FROM agents WHERE id = $1 AND actif = 1", [agentId]);
    if (!agent) return res.status(404).json({ error: 'Agent introuvable' });

    const isMatch = await bcrypt.compare(pin, agent.pin_hash);
    if (!isMatch) return res.status(401).json({ error: 'PIN incorrect' });

    await db.query("UPDATE agents SET derniere_connexion = NOW() WHERE id = $1", [agent.id]);

    const token = jwt.sign({ id: agent.id, role: agent.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, agent: { id: agent.id, nom: agent.nom, prenom: agent.prenom, role: agent.role, doit_changer_pin: agent.doit_changer_pin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Admin Local
router.post('/auth/admin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    // Par convention, le mot de passe admin est stocké dans pin_hash aussi
    const agent = await db.get("SELECT * FROM agents WHERE email = $1 AND role = 'admin' AND actif = 1", [email]);
    if (!agent) return res.status(404).json({ error: 'Admin introuvable' });

    const isMatch = await bcrypt.compare(password, agent.pin_hash);
    if (!isMatch) return res.status(401).json({ error: 'Identifiants incorrects' });

    await db.query("UPDATE agents SET derniere_connexion = NOW() WHERE id = $1", [agent.id]);

    const token = jwt.sign({ id: agent.id, role: agent.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, agent: { id: agent.id, nom: agent.nom, prenom: agent.prenom, role: agent.role, email: agent.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Admin Supabase
router.post('/auth/supabase-admin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    let agent = await db.get("SELECT * FROM agents WHERE email = $1 AND actif = 1", [email]);
    
    if (!agent) {
      // Create admin automatically since they authenticated via Supabase
      const uniqueMatricule = 'SUPABASE-' + Date.now();
      const insertRes = await db.run(`
        INSERT INTO agents (nom, prenom, email, matricule, role, pin_hash, actif)
        VALUES ('Admin', 'Supabase', $1, $2, 'admin', 'supabase', 1)
        RETURNING id
      `, [email, uniqueMatricule]);
      agent = await db.get("SELECT * FROM agents WHERE id = $1", [insertRes.lastId]);
    } else if (agent.role !== 'admin') {
      // Ensure they have admin role
      await db.run("UPDATE agents SET role = 'admin' WHERE id = $1", [agent.id]);
      agent.role = 'admin';
    }

    await db.run("UPDATE agents SET derniere_connexion = NOW() WHERE id = $1", [agent.id]);

    const token = jwt.sign({ id: agent.id, role: agent.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, agent: { id: agent.id, nom: agent.nom, prenom: agent.prenom, role: agent.role, email: agent.email } });
  } catch (err) {
    console.error("Supabase Admin Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Autre routes (Create, Update) à compléter...

router.get('/all', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const agents = await db.all("SELECT id, nom, prenom, matricule, role, telephone, email FROM agents WHERE actif = 1");
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, prenom, matricule, role, pin, telephone, email } = req.body;
    const pinHash = await bcrypt.hash(pin, 10);
    
    await db.query(`
      INSERT INTO agents (nom, prenom, matricule, pin_hash, role, telephone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [nom, prenom, matricule, pinHash, role, telephone, email]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
