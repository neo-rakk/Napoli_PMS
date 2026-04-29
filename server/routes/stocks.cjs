const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

// Init schema
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS stock_articles (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        categorie TEXT, -- 'housekeeping', 'maintenance', 'pos', 'economat'
        quantite_actuelle REAL DEFAULT 0,
        seuil_alerte REAL DEFAULT 5,
        unite TEXT DEFAULT 'Unité',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS stock_mouvements (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES stock_articles(id),
        agent_id INTEGER,
        type_mouvement TEXT, -- 'entree', 'sortie', 'inventaire'
        quantite REAL,
        reference TEXT, -- BDC, Ticket, etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error("Init Stocks DB Err:", e.message);
  }
})();

// Liste des articles
router.get('/', requireAuth, async (req, res) => {
  try {
    const articles = await db.all("SELECT * FROM stock_articles ORDER BY categorie, nom");
    res.json(articles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Créer un article
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, categorie, seuil_alerte, unite, description } = req.body;
    await db.query(`
      INSERT INTO stock_articles (nom, categorie, seuil_alerte, unite, description)
      VALUES ($1, $2, $3, $4, $5)
    `, [nom, categorie, seuil_alerte, unite, description]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mouvement de stock
router.post('/:id/mouvements', requireAuth, requireRole('admin', 'housekeeping', 'maintenance', 'pos'), async (req, res) => {
  try {
    const { type_mouvement, quantite, reference } = req.body;
    const articleId = req.params.id;
    const qte = parseFloat(quantite);

    await db.transaction(async (client) => {
      await client.query(`
        INSERT INTO stock_mouvements (article_id, agent_id, type_mouvement, quantite, reference)
        VALUES ($1, $2, $3, $4, $5)
      `, [articleId, req.agent.id, type_mouvement, qte, reference]);

      const signe = type_mouvement === 'entree' ? '+' : '-';
      await client.query(`
        UPDATE stock_articles 
        SET quantite_actuelle = quantite_actuelle ${signe} $1
        WHERE id = $2
      `, [qte, articleId]);
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Historique des mouvements
router.get('/:id/mouvements', requireAuth, async (req, res) => {
  try {
    const mvt = await db.all(`
      SELECT m.*, a.prenom, a.nom as agent_nom 
      FROM stock_mouvements m 
      LEFT JOIN agents a ON m.agent_id = a.id
      WHERE m.article_id = $1
      ORDER BY m.created_at DESC LIMIT 50
    `, [req.params.id]);
    res.json(mvt);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
