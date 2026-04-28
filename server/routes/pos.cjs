const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

// Initialize POS schema and seed some basic products
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_products (
        id SERIAL PRIMARY KEY, 
        nom TEXT, 
        categorie TEXT, 
        prix REAL, 
        image TEXT, 
        actif INTEGER DEFAULT 1
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_tables (
        id SERIAL PRIMARY KEY,
        nom TEXT,
        capacite INTEGER,
        status TEXT DEFAULT 'libre' -- 'libre', 'reservee', 'occupee'
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_ingredients (
        id SERIAL PRIMARY KEY,
        nom TEXT,
        stock_qty REAL DEFAULT 0
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_product_ingredients (
        product_id INTEGER,
        ingredient_id INTEGER,
        quantite_requise REAL,
        PRIMARY KEY (product_id, ingredient_id)
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id SERIAL PRIMARY KEY, 
        agent_id INTEGER, 
        methode_paiement TEXT, 
        chambre_id INTEGER, 
        table_id INTEGER,
        reservation_id INTEGER,
        total REAL, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_order_items (
        id SERIAL PRIMARY KEY, 
        order_id INTEGER, 
        product_id INTEGER, 
        quantite INTEGER, 
        prix_unitaire REAL
      )
    `);

    // Add room_charge to reservations to track pending POS payments at checkout
    try {
      await db.query(`ALTER TABLE reservations ADD COLUMN total_extras REAL DEFAULT 0`);
    } catch(e) { /* Column might exist */ }

    // Seed data
    const countRes = await db.get(`SELECT COUNT(*) as count FROM pos_products`);
    if (countRes && countRes.count === 0) {
      await db.query(`INSERT INTO pos_products (nom, categorie, prix) VALUES 
        ('Café Espresso', 'Boissons Chaudes', 150),
        ('Cappuccino', 'Boissons Chaudes', 250),
        ('Jus d''Orange Frais', 'Boissons Froides', 300),
        ('Soda', 'Boissons Froides', 150),
        ('Bouteille d''eau 1.5L', 'Boissons Froides', 100),
        ('Croissant au beurre', 'Viennoiseries', 100),
        ('Pain au chocolat', 'Viennoiseries', 120),
        ('Sandwich Poulet', 'Snacks', 450),
        ('Plat du Jour', 'Plats', 1200),
        ('Salade César', 'Plats', 800)
      `);
    }
  } catch(e) {
    console.error("Erreur init POS DB:", e.message);
  }
})();

// Récupérer le catalogue produit
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await db.all("SELECT * FROM pos_products WHERE actif = 1 ORDER BY categorie, nom");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les tables
router.get('/tables', requireAuth, async (req, res) => {
  try {
    const tables = await db.all("SELECT * FROM pos_tables ORDER BY nom");
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une table
router.post('/tables', requireAuth, async (req, res) => {
    try {
        const { nom, capacite } = req.body;
        await db.query(`INSERT INTO pos_tables (nom, capacite) VALUES ($1, $2)`, [nom, capacite]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Récupérer les ingrédients
router.get('/ingredients', requireAuth, async (req, res) => {
    try {
        const ingredients = await db.all("SELECT * FROM pos_ingredients ORDER BY nom");
        res.json(ingredients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajouter un ingrédient
router.post('/ingredients', requireAuth, async (req, res) => {
    try {
        const { nom, stock_qty } = req.body;
        await db.query(`INSERT INTO pos_ingredients (nom, stock_qty) VALUES ($1, $2)`, [nom, stock_qty]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enregistrer une commande (caisse)
router.post('/orders', requireAuth, async (req, res) => {
  try {
    const { items, total, methode_paiement, chambre_id, reservation_id } = req.body;
    
    // 1. Créer la commande
    const orderRes = await db.query(
      `INSERT INTO pos_orders (agent_id, methode_paiement, chambre_id, total) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, methode_paiement, chambre_id || null, total]
    );

    const orderId = orderRes[0]?.id || null; // For postgres notation, if SQLite, standard return id handling is needed
    // let's just query max ID or use db.run lastID
    const lastOrder = await db.get(`SELECT id FROM pos_orders ORDER BY id DESC LIMIT 1`);
    const finalOrderId = orderId || lastOrder.id;

    // 2. Insérer les articles
    for (const item of items) {
      await db.query(
        `INSERT INTO pos_order_items (order_id, product_id, quantite, prix_unitaire) VALUES ($1, $2, $3, $4)`,
        [finalOrderId, item.product_id, item.quantite, item.prix]
      );
    }

    // 3. Imputation chambre si c'est le cas
    if (methode_paiement === 'chambre' && reservation_id) {
       await db.query(`UPDATE reservations SET total_extras = COALESCE(total_extras, 0) + $1 WHERE id = $2`, [total, reservation_id]);
       // Create an encaissement note (unpaid, waiting for checkout)
    } else {
       // Create direct encaissement
       await db.query(`
          INSERT INTO encaissements (type, reference_id, montant, methode, agent_id)
          VALUES ('pos', $1, $2, $3, $4)
       `, [finalOrderId, total, methode_paiement, req.user.id]);
    }

    res.json({ success: true, orderId: finalOrderId });
  } catch (err) {
    // Handling array out of bounds for orderRes SQLite fallback above
    try {
      const { items, total, methode_paiement, chambre_id, reservation_id } = req.body;
      await db.run(
          `INSERT INTO pos_orders (agent_id, methode_paiement, chambre_id, total) VALUES ($1, $2, $3, $4)`,
          [req.user.id, methode_paiement, chambre_id || null, total]
      );
      const lastOrder = await db.get(`SELECT id FROM pos_orders ORDER BY id DESC LIMIT 1`);
      for (const item of items) {
        await db.run(
          `INSERT INTO pos_order_items (order_id, product_id, quantite, prix_unitaire) VALUES ($1, $2, $3, $4)`,
          [lastOrder.id, item.product_id, item.quantite, item.prix]
        );
      }
      if (methode_paiement === 'chambre' && reservation_id) {
         await db.run(`UPDATE reservations SET total_extras = coalesce(total_extras,0) + $1 WHERE id = $2`, [total, reservation_id]);
      } else {
         await db.run(`INSERT INTO encaissements (type, reference_id, montant, methode, agent_id) VALUES ('pos', $1, $2, $3, $4)`, [lastOrder.id, total, methode_paiement, req.user.id]);
      }
      return res.json({ success: true, orderId: lastOrder.id });
    } catch(fallbackErr) {
       res.status(500).json({ error: fallbackErr.message });
    }
  }
});

module.exports = router;
