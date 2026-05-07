const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

// Initialize schema updates gracefully
(async () => {
  try {
    await db.query(`ALTER TABLE maintenance ALTER COLUMN chambre_id DROP NOT NULL;`);
  } catch(e) {}
  try {
    await db.query(`ALTER TABLE maintenance ADD COLUMN localisation TEXT;`);
  } catch(e) {}
  try {
    await db.query(`ALTER TABLE maintenance ADD COLUMN type_panne TEXT;`);
  } catch(e) {}
  try {
    await db.query(`ALTER TABLE maintenance ADD COLUMN rapport TEXT;`);
  } catch(e) {}
})();

// Obtenir toutes les tâches de maintenance
router.get('/', requireAuth, async (req, res) => {
  try {
    const taches = await db.all(`
      SELECT m.*, 
             c.numero as chambre_numero, c.bloc as chambre_bloc,
             s.nom as signaleur_nom, s.prenom as signaleur_prenom, s.role as signaleur_role,
             a.nom as agent_nom, a.prenom as agent_prenom
      FROM maintenance m
      LEFT JOIN chambres c ON m.chambre_id = c.id
      LEFT JOIN agents s ON m.signale_par = s.id
      LEFT JOIN agents a ON m.assigne_a = a.id
      ORDER BY m.created_at DESC
    `);
    res.json(taches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un ticket (Housekeeping ou Reception)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { chambre_id, localisation, type_panne, description, priorite, photo_probleme } = req.body;
    await db.query(`
      INSERT INTO maintenance (chambre_id, localisation, type_panne, description, priorite, signale_par, photo_probleme) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [chambre_id || null, localisation, type_panne, description, priorite, req.agent.id, photo_probleme]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assigner un ticket à un technicien
router.post('/:id/assigner', requireAuth, requireRole('admin', 'accueil'), async (req, res) => {
  try {
    const { assigne_a } = req.body;
    await db.query(`UPDATE maintenance SET assigne_a = $1, statut = 'en_cours' WHERE id = $2`, [assigne_a, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour l'état (par le tech)
router.post('/:id/statut', requireAuth, requireRole('admin', 'accueil', 'maintenance'), async (req, res) => {
  try {
    const { statut, rapport, photo_reparation } = req.body;
    let query = `UPDATE maintenance SET statut = $1`;
    let params = [statut];
    let pIdx = 2;

    if (statut === 'resolu') {
      query += `, date_resolution = NOW(), photo_reparation = $${pIdx++}`;
      params.push(photo_reparation);
    }

    query += ` WHERE id = $${pIdx}`;
    params.push(req.params.id);

    await db.query(query, params);
    
    // Create an audit string if rapport provided
    if(statut === 'resolu' && rapport) {
      await db.query(`UPDATE maintenance SET rapport = $1 WHERE id = $2`, [rapport, req.params.id]).catch(()=>null);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une demande d'achat
router.post('/:id/achats', requireAuth, async (req, res) => {
  try {
    const { designation, quantite, urgence } = req.body;
    await db.query(`
      INSERT INTO maintenance_pieces_demandees (maintenance_id, agent_id, designation, quantite, urgence)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, req.agent.id, designation, quantite, urgence]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les achats d'un ticket
router.get('/:id/achats', requireAuth, async (req, res) => {
  try {
    const achats = await db.all(`SELECT * FROM maintenance_pieces_demandees WHERE maintenance_id = $1 ORDER BY created_at DESC`, [req.params.id]);
    res.json(achats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Télécharger le Bilan (Data provider)
router.get('/report/bilan', requireAuth, async (req, res) => {
  try {
    const interventions = await db.all(`
      SELECT m.*, 
             c.numero as chambre_numero, c.bloc as chambre_bloc
      FROM maintenance m
      LEFT JOIN chambres c ON m.chambre_id = c.id
      WHERE m.assigne_a = $1 AND m.statut = 'resolu' AND COALESCE(m.archive_bilan, 0) = 0
      ORDER BY m.date_resolution DESC
    `, [req.agent.id]);

    const ids = interventions.map(i => i.id);
    let achats = [];
    if (ids.length > 0) {
      achats = await db.all(`
        SELECT * FROM maintenance_pieces_demandees
        WHERE maintenance_id = ANY($1::int[])
        ORDER BY created_at ASC
      `, [ids]);
    }

    res.json({ interventions, achats });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Remise a zero des bilans
router.post('/admin/reset-bilans', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.query(`UPDATE maintenance SET archive_bilan = 1 WHERE statut = 'resolu' AND COALESCE(archive_bilan, 0) = 0`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
