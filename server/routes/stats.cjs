'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const statsChambres = await db.all("SELECT statut, COUNT(*) as count FROM chambres GROUP BY statut");
    const chambres = { libres: 0, occupees: 0, partielles: 0, travaux: 0, bloquees: 0, stock: 0 };
    let totalActif = 0;

    statsChambres.forEach(row => {
      const count = parseInt(row.count, 10);
      if (row.statut === 'libre') chambres.libres = count;
      if (row.statut === 'occupee') chambres.occupees = count;
      if (row.statut === 'partielle') chambres.partielles = count;
      if (row.statut === 'travaux') chambres.travaux = count;
      if (row.statut === 'bloquee') chambres.bloquees = count;
      if (row.statut === 'stock_etage') chambres.stock = count;
      
      if (['libre', 'occupee', 'partielle'].includes(row.statut)) {
        totalActif += count;
      }
    });

    const tauxOccupation = totalActif > 0 ? Math.round(((chambres.occupees + chambres.partielles) / totalActif) * 100) : 0;

    const personnel_present = { accueil: 0, securite: 0, housekeeping: 0, maintenance: 0 };
    // Remplacer par des vraies requêtes sur presences
    const statsPres = await db.all(`
      SELECT p.poste, COUNT(*) as count FROM presences p 
      JOIN agents a ON p.agent_id = a.id
      WHERE p.date = CURRENT_DATE AND p.heure_depart IS NULL
      GROUP BY p.poste
    `);
    
    statsPres.forEach(row => {
      if (personnel_present[row.poste] !== undefined) {
        personnel_present[row.poste] = parseInt(row.count, 10);
      }
    });

    res.json({
      chambres: { ...chambres, tauxOccupation },
      personnel_present,
      caisse_du_jour: 0 // A calculer plus tard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
