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

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const totalChambres = await db.get("SELECT COUNT(*) as count FROM chambres");
    const chambresOccupees = await db.get("SELECT COUNT(*) as count FROM chambres WHERE statut IN ('occupee', 'partielle')");
    const clientsInHouse = await db.get("SELECT COUNT(*) as count FROM clients WHERE statut IN ('enregistre', 'resident')");
    
    const checkinsToday = await db.get("SELECT COUNT(*) as count FROM reservations WHERE statut = 'checkin' AND DATE(created_at) = CURRENT_DATE");
    const checkoutsToday = await db.get("SELECT COUNT(*) as count FROM reservations WHERE statut = 'checkout' AND DATE(date_depart) = CURRENT_DATE");

    // Recettes du jour (Encaissements)
    const recettesJour = await db.get("SELECT SUM(montant) as total FROM encaissements WHERE DATE(created_at) = CURRENT_DATE");
    const caisseDuJour = recettesJour && recettesJour.total ? parseFloat(recettesJour.total) : 0;

    res.json({
      total_chambres: totalChambres ? parseInt(totalChambres.count) : 0,
      chambres_occupees: chambresOccupees ? parseInt(chambresOccupees.count) : 0,
      clients_inhouse: clientsInHouse ? parseInt(clientsInHouse.count) : 0,
      checkins_today: checkinsToday ? parseInt(checkinsToday.count) : 0,
      checkouts_today: checkoutsToday ? parseInt(checkoutsToday.count) : 0,
      caisse_du_jour: caisseDuJour
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

router.get('/analytics', requireAuth, async (req, res) => {
  try {
    // Évolution des réservations sur les 7 derniers jours (simplifié)
    const eol = await db.all(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM reservations 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Récupérer les données de revenus par mode de paiement
    const revModes = await db.all(`
      SELECT type_paiement as mode, SUM(montant) as total 
      FROM encaissements 
      GROUP BY type_paiement
    `);

    res.json({
      reservations_7d: eol,
      revenus_modes: revModes
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

router.get('/audit', requireAuth, async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT al.*, a.nom as agent_nom, a.prenom as agent_prenom
      FROM audit_log al
      LEFT JOIN agents a ON al.agent_id = a.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    
    // Parser JSON
    logs.forEach(l => {
      try {
        if(l.details) l.details = JSON.parse(l.details);
      } catch(e) {}
    });
    
    res.json(logs);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
