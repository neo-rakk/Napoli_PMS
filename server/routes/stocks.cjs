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

// Mettre à jour un article
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { nom, categorie, seuil_alerte, unite, description } = req.body;
    await db.query(`
      UPDATE stock_articles 
      SET nom = $1, categorie = $2, seuil_alerte = $3, unite = $4, description = $5 
      WHERE id = $6
    `, [nom, categorie, seuil_alerte, unite, description, req.params.id]);
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

// Demandes de maintenance
router.get('/notifications', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const row = await db.get(`SELECT COUNT(*) as count FROM maintenance_pieces_demandees WHERE statut = 'en_attente'`);
    res.json({ count: row.count || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/demandes-maintenance', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const demandes = await db.all(`
      SELECT d.*, m.description as panne_desc, m.priorite as panne_priorite, 
             c.numero as chambre_numero, c.bloc as chambre_bloc,
             a.nom as agent_nom, a.prenom as agent_prenom
      FROM maintenance_pieces_demandees d
      LEFT JOIN maintenance m ON d.maintenance_id = m.id
      LEFT JOIN chambres c ON (m.chambre_id = c.id OR d.chambre_id = c.id)
      LEFT JOIN agents a ON d.agent_id = a.id
      ORDER BY d.created_at DESC
    `);
    res.json(demandes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/demandes-maintenance/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { designation, quantite } = req.body;
    await db.query(`UPDATE maintenance_pieces_demandees SET designation = $1, quantite = $2 WHERE id = $3`, [designation, quantite, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/demandes-maintenance/direct', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { articles } = req.body; // Array { designation, quantite }
    await db.transaction(async (client) => {
      for (const article of articles) {
        await client.query(`
          INSERT INTO maintenance_pieces_demandees 
          (agent_id, designation, quantite, statut, urgence)
          VALUES ($1, $2, $3, 'en_attente', 'normale')
        `, [req.agent.id, article.designation, article.quantite]);
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/demandes-maintenance/:id/fournir', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { article_id, quantite } = req.body;
    
    await db.transaction(async (client) => {
       // 1. Decrement stock
       await client.query(`UPDATE stock_articles SET quantite_actuelle = quantite_actuelle - $1 WHERE id = $2`, [quantite, article_id]);
       
       // 2. Insert sortie movement
       const refMvt = `Fourniture Interne (Demande #${req.params.id})`;
       await client.query(`
          INSERT INTO stock_mouvements (article_id, agent_id, type_mouvement, quantite, reference)
          VALUES ($1, $2, 'sortie', $3, $4)
       `, [article_id, req.agent.id, quantite, refMvt]);

       // 3. Mark demande as completed (mis_a_disposition)
       // We can also save the article_id to this request to link it, but wait, schema doesn't have it. Just changing the status.
       await client.query(`UPDATE maintenance_pieces_demandees SET statut = 'mis_a_disposition', designation = (SELECT nom FROM stock_articles WHERE id = $1) WHERE id = $2`, [article_id, req.params.id]);
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/demandes-maintenance/:id/statut', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { statut } = req.body;
    await db.query(`UPDATE maintenance_pieces_demandees SET statut = $1 WHERE id = $2`, [statut, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/demandes-maintenance/commander', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { ids, quantites } = req.body;
    // ids: array of piece request IDs
    // quantites: object mapping id to the ordered quantity
    
    await db.transaction(async (client) => {
      for (const id of ids) {
        let qte = quantites[id];
        if (qte) {
           await client.query(`UPDATE maintenance_pieces_demandees SET statut = 'commande', quantite_commandee = $1 WHERE id = $2`, [qte, id]);
        } else {
           await client.query(`UPDATE maintenance_pieces_demandees SET statut = 'commande', quantite_commandee = quantite WHERE id = $1`, [id]);
        }
      }
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/demandes-maintenance/:id/recevoir', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { quantite_recue } = req.body;
    
    await db.transaction(async (client) => {
      // 1. Get the original demande
      const resDemande = await client.query(`SELECT * FROM maintenance_pieces_demandees WHERE id = $1`, [req.params.id]);
      const demande = resDemande.rows[0];
      if (!demande) throw new Error("Demande introuvable");

      const qteDemandee = demande.quantite || 1;
      // We calculate extra based on the difference between received and genuinely requested by the technician.
      // If the admin received more than what was initially requested, the extra goes to stock.
      // If it's a direct purchase (no maintenance_id), ALL of it goes to stock.
      const isDirectPurchase = !demande.maintenance_id;
      const qteExtra = isDirectPurchase ? quantite_recue : (quantite_recue > qteDemandee ? quantite_recue - qteDemandee : 0);

      // 2. Mark as mis_a_disposition
      await client.query(`UPDATE maintenance_pieces_demandees SET statut = 'mis_a_disposition' WHERE id = $1`, [req.params.id]);

      // 3. If there's extra, try to save/update it in stock_articles
      if (qteExtra > 0) {
        // Look for an existing article with exact same name in maintenance or economat
        const existingArticle = await client.query(`SELECT id FROM stock_articles WHERE nom = $1`, [demande.designation]);
        let articleId;

        if (existingArticle.rows.length > 0) {
           articleId = existingArticle.rows[0].id;
           await client.query(`UPDATE stock_articles SET quantite_actuelle = quantite_actuelle + $1 WHERE id = $2`, [qteExtra, articleId]);
        } else {
           const insertRes = await client.query(`
             INSERT INTO stock_articles (nom, categorie, quantite_actuelle, seuil_alerte, unite)
             VALUES ($1, $2, $3, 2, 'Unités') RETURNING id
           `, [demande.designation, isDirectPurchase ? 'economat' : 'maintenance', qteExtra]);
           articleId = insertRes.rows[0].id;
        }

        // Add a movement history
        const refMvt = isDirectPurchase ? 'Achat Direct Économat' : `Surplus Achat Maintenance (Ticket #${demande.maintenance_id})`;
        await client.query(`
           INSERT INTO stock_mouvements (article_id, agent_id, type_mouvement, quantite, reference)
           VALUES ($1, $2, 'entree', $3, $4)
        `, [articleId, req.agent.id, qteExtra, refMvt]);
      }
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/etat-complet', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const articles = await db.all("SELECT * FROM stock_articles ORDER BY categorie, nom");
    const mouvements = await db.all(`
      SELECT m.*, a.prenom, a.nom as agent_nom, s.nom as article_nom 
      FROM stock_mouvements m 
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN stock_articles s ON m.article_id = s.id
      ORDER BY m.created_at DESC
    `);
    
    res.json({ articles, mouvements });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
