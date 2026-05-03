'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');
const { logAction } = require('../middleware/auditLogger.cjs');

// GET /api/housekeeping — liste tâches avec filtres
router.get('/', requireAuth, async (req, res) => {
  try {
    const { statut, agent_id, date, priorite } = req.query;
    let query = `
      SELECT h.*, c.numero as chambre_numero, c.type as chambre_type,
             b.nom as chambre_bloc, b.code as bloc_code,
             a.nom as agent_nom, a.prenom as agent_prenom
      FROM housekeeping h
      JOIN chambres c ON h.chambre_id = c.id
      LEFT JOIN blocs b ON h.bloc_id = b.id
      LEFT JOIN agents a ON h.agent_id = a.id
      WHERE 1=1
    `;
    const params = [];
    if (statut) { 
      // Handle comma-separated status
      if(statut.includes(',')) {
        const statuses = statut.split(',');
        const placeholders = statuses.map((_, i) => `$${params.length + 1 + i}`).join(',');
        query += ` AND h.statut IN (${placeholders})`;
        params.push(...statuses);
      } else {
        params.push(statut); query += ` AND h.statut = $${params.length}`; 
      }
    }
    if (agent_id) { params.push(agent_id); query += ` AND h.agent_id = $${params.length}`; }
    if (date) { params.push(date); query += ` AND h.date_affectation = $${params.length}`; }
    if (priorite) { params.push(priorite); query += ` AND h.priorite = $${params.length}`; }
    query += " ORDER BY h.priorite DESC, h.date_affectation DESC";
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/housekeeping — créer une tâche
router.post('/', requireAuth, requireRole('admin', 'accueil', 'housekeeping'), async (req, res) => {
  try {
    const { chambre_id, type, priorite, observations, agent_id, date_affectation } = req.body;
    if (!chambre_id || !type) return res.status(400).json({ error: 'chambre_id et type obligatoires' });
    
    const chambre = await db.get("SELECT * FROM chambres WHERE id = $1", [chambre_id]);
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });

    const result = await db.run(`
      INSERT INTO housekeeping (chambre_id, bloc_id, etage, agent_id, date_affectation, type, priorite, observations)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [
      chambre_id, chambre.bloc_id, chambre.etage,
      agent_id || null,
      date_affectation || new Date().toISOString().split('T')[0],
      type, priorite || 'normale', observations || null
    ]);
    await logAction(req.agent.id, 'CREATION_HK', 'housekeeping', result.lastId, { chambre_id, type });
    res.status(201).json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/housekeeping/:id — modifier statut / infos
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { statut, observations, heure_debut, heure_fin, agent_id, photo_avant, photo_apres } = req.body;
    const fields = [];
    const params = [];
    const addField = (col, val) => { if (val !== undefined) { params.push(val); fields.push(`${col} = $${params.length}`); } };
    
    addField('statut', statut);
    addField('observations', observations);
    addField('heure_debut', heure_debut);
    addField('heure_fin', heure_fin);
    addField('agent_id', agent_id);
    addField('photo_avant', photo_avant);
    addField('photo_apres', photo_apres);
    
    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier' });
    params.push(req.params.id);
    await db.run(`UPDATE housekeeping SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
    await logAction(req.agent.id, 'MODIFICATION_HK', 'housekeeping', req.params.id, req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/housekeeping/:id/consommables — demande consommables
router.post('/:id/consommables', requireAuth, async (req, res) => {
  try {
    const { produit, quantite, unite, notes } = req.body;
    if (!produit) return res.status(400).json({ error: 'produit obligatoire' });
    const result = await db.run(`
      INSERT INTO hk_consommables_demandes (hk_id, agent_id, produit, quantite, unite, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [req.params.id, req.agent.id, produit, quantite || 1, unite || 'unité', notes || null]);
    await logAction(req.agent.id, 'DEMANDE_CONSOMMABLES', 'hk_consommables_demandes', result.lastId, { produit });
    res.status(201).json({ success: true, id: result.lastId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/housekeeping/:id/consommables/:cid — traiter demande consommable
router.put('/:id/consommables/:cid', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { statut } = req.body;
    await db.run("UPDATE hk_consommables_demandes SET statut = $1 WHERE id = $2", [statut, req.params.cid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/housekeeping/:id/consommables — liste demandes d'une tâche
router.get('/:id/consommables', requireAuth, async (req, res) => {
  try {
    const items = await db.all("SELECT * FROM hk_consommables_demandes WHERE hk_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/housekeeping/demandes-internes — fetch housekeeping generic demands
router.get('/demandes-internes', requireAuth, async (req, res) => {
  try {
    const demandes = await db.all(`
      SELECT d.*, c.numero as chambre_numero 
      FROM maintenance_pieces_demandees d
      LEFT JOIN chambres c ON d.chambre_id = c.id
      WHERE d.origine = 'housekeeping'
      ORDER BY d.created_at DESC
    `);
    res.json(demandes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/housekeeping/demandes-internes — define a new request
router.post('/demandes-internes', requireAuth, async (req, res) => {
  try {
    const { designation, quantite, urgence, notes, chambre_id } = req.body;
    await db.query(`
      INSERT INTO maintenance_pieces_demandees (agent_id, designation, quantite, urgence, notes, origine, chambre_id)
      VALUES ($1, $2, $3, $4, $5, 'housekeeping', $6)
    `, [req.agent.id, designation, quantite, urgence || 'normale', notes, chambre_id || null]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/housekeeping/buanderie/articles
router.get('/buanderie/articles', requireAuth, async (req, res) => {
  try {
    const articles = await db.all("SELECT * FROM buanderie_articles ORDER BY categorie, nom");
    res.json(articles);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/housekeeping/buanderie/mouvement
router.post('/buanderie/mouvement', requireAuth, async (req, res) => {
  try {
    const { type, reference, lignes } = req.body;
    await db.transaction(async (client) => {
      const mvtRes = await client.query(`
        INSERT INTO buanderie_mouvements (agent_id, type, reference) VALUES ($1, $2, $3) RETURNING id
      `, [req.agent.id, type, reference]);
      const mvtId = mvtRes.rows[0].id;
      
      for (const ligne of lignes) {
         await client.query(`INSERT INTO buanderie_lignes_mvt (mouvement_id, article_id, quantite) VALUES ($1, $2, $3)`, [mvtId, ligne.article_id, ligne.quantite]);
         
         // Update stock
         if (type === 'envoi_externe') {
            await client.query(`UPDATE buanderie_articles SET quantite_sale = quantite_sale - $1, quantite_externe = quantite_externe + $1 WHERE id = $2`, [ligne.quantite, ligne.article_id]);
         } else if (type === 'reception_externe') {
            await client.query(`UPDATE buanderie_articles SET quantite_externe = quantite_externe - $1, quantite_propre = quantite_propre + $1 WHERE id = $2`, [ligne.quantite, ligne.article_id]);
         } else if (type === 'ajout_stock') {
            await client.query(`UPDATE buanderie_articles SET quantite_propre = quantite_propre + $1 WHERE id = $2`, [ligne.quantite, ligne.article_id]);
         } else if (type === 'retrait_perte') {
            await client.query(`UPDATE buanderie_articles SET quantite_propre = quantite_propre - $1 WHERE id = $2`, [ligne.quantite, ligne.article_id]);
         }
      }
    });
    res.status(201).json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/housekeeping/buanderie/articles — add new article type
router.post('/buanderie/articles', requireAuth, async (req, res) => {
  try {
    const { nom, categorie } = req.body;
    await db.query("INSERT INTO buanderie_articles (nom, categorie) VALUES ($1, $2)", [nom, categorie]);
    res.status(201).json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
