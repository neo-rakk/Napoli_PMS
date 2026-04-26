'use strict';
require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');

async function setup() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.log('[Setup BDD] Ignoré : POSTGRES_URL_NON_POOLING ou DATABASE_URL non trouvés.');
    return;
  }

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, '../../schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('[Setup BDD] Vérification et création du schéma...');
    await pool.query(sql);

    console.log('[Setup BDD] Vérification des données initiales (blocs, chambres, tarifs, admin)...');
    
    // Blocs
    await pool.query(`INSERT INTO blocs (nom, code, description, nb_etages) VALUES 
      ('A', 'BL-A', 'Bâtiment A', 2),
      ('B', 'BL-B', 'Bâtiment B', 2),
      ('C', 'BL-C', 'Bâtiment C', 2) ON CONFLICT DO NOTHING`);

    // Chambres
    const res = await pool.query("SELECT * FROM blocs");
    const blocs = res.rows;
    for (const bloc of blocs) {
      for (let floor = 1; floor <= bloc.nb_etages; floor++) {
        for (let i = 1; i <= 10; i++) {
          const num = `${bloc.nom}${floor}${i.toString().padStart(2, '0')}`;
          let type = 'Single'; let cap = 1;
          if (i >= 7 && i <= 8) { type = 'Twin'; cap = 2; }
          else if (i === 9) { type = 'Triple'; cap = 3; }
          else if (i === 10) { type = 'Suite'; cap = 4; }

          await pool.query(`INSERT INTO chambres (numero, bloc, bloc_id, etage, type, capacite_max, statut)
            VALUES ($1, $2, $3, $4, $5, $6, 'libre') ON CONFLICT DO NOTHING`,
            [num, bloc.nom, bloc.id, floor, type, cap]);
        }
      }
    }

    // Tarifs
    const { rowCount: tarifsCount } = await pool.query("SELECT id FROM tarifs LIMIT 1");
    if (tarifsCount === 0) {
      console.log('[Setup BDD] Création des tarifs par défaut...');
      const types = ['Single','Twin','Triple','Quad','Suite'];
      const formulas = ['PD','DP','PC'];
      for(const t of types) {
        let ext = 0;
        if(t==='Twin') ext=500; else if(t==='Triple') ext=1300; else if(t==='Quad') ext=2000; else if(t==='Suite') ext=3500;
        for(const f of formulas) {
          let prix = 1500 + ext;
          let p_pdj = 300, p_dej = 0, p_din = 0;
          if(f==='DP') p_dej = 400;
          if(f==='PC') { p_dej = 400; p_din = 350; }
          await pool.query(`INSERT INTO tarifs (type_chambre, formule, prix_nuit, prix_pdj, prix_dejeuner, prix_diner, date_application)
            VALUES ($1, $2, $3, $4, $5, $6, '2026-01-01')`,
            [t, f, prix, p_pdj, p_dej, p_din]);
        }
      }
    }

    // Agent Administrateur Par Défaut (si la BDD est vierge d'agents)
    const { rowCount: agentCount } = await pool.query("SELECT id FROM agents LIMIT 1");
    if (agentCount === 0) {
      console.log('[Setup BDD] Création des agents par défaut...');
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('123456', 10);
      const adminHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@2026!', 10);
      
      await pool.query(`INSERT INTO agents (nom, prenom, role, pin_hash, email) VALUES 
        ('Admin', 'Super', 'admin', $1, 'admin@napoli.com'),
        ('Reception', 'Agent', 'accueil', $2, 'accueil@napoli.com')
        ON CONFLICT DO NOTHING`, [adminHash, hash]);
    }

    console.log('[Setup BDD] Grand Compte (B2B) par défaut...');
    await pool.query(`INSERT INTO grands_comptes (nom, contact_nom) VALUES ('Fédération Algérienne d''Athlétisme', 'M. Directeur') ON CONFLICT DO NOTHING`);

    console.log('[Setup BDD] Succès de la configuration de la base de données !');
  } catch (error) {
    console.error('[Setup BDD] ERREUR LORS DU SETUP :', error);
    // On ne coupe pas process.exit(1) sur le build Vercel si c'est un timeout DB, 
    // l'utilisateur pourra ré-exécuter le script plus tard si sa BD met du temps à se lancer
  } finally {
    pool.end();
  }
}

setup();
