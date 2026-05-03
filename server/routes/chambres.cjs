'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database.cjs');
const { requireAuth, requireRole } = require('../middleware/auth.cjs');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { statut, bloc_id, type } = req.query;
    let query = "SELECT c.*, b.nom as bloc_nom FROM chambres c LEFT JOIN blocs b ON c.bloc_id = b.id WHERE 1=1";
    let params = [];
    if (statut) {
      params.push(statut);
      query += ` AND c.statut = $${params.length}`;
    }
    if (bloc_id) {
      params.push(bloc_id);
      query += ` AND c.bloc_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND c.type = $${params.length}`;
    }
    query += " ORDER BY b.nom, c.etage, c.numero";
    const chambres = await db.all(query, params);
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/disponibles', requireAuth, async (req, res) => {
  try {
    const chambres = await db.all("SELECT c.*, b.nom as bloc_nom FROM chambres c LEFT JOIN blocs b ON c.bloc_id = b.id WHERE c.statut IN ('libre', 'partielle') ORDER BY b.nom, c.etage, c.numero");
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/statut', requireAuth, async (req, res) => {
  try {
    const { statut } = req.body;
    if (!statut) return res.status(400).json({ error: 'Statut requis' });
    
    // Some basic validation: don't allow changing to 'libre' if nb_occupants > 0
    const chambre = await db.get("SELECT * FROM chambres WHERE id = $1", [req.params.id]);
    if (!chambre) return res.status(404).json({ error: 'Chambre introuvable' });
    
    if (statut === 'libre' && chambre.nb_occupants_actuels > 0) {
      return res.status(400).json({ error: 'La chambre n\'est pas vide, elle ne peut pas être libre.' });
    }
    
    await db.query("UPDATE chambres SET statut = $1 WHERE id = $2", [statut, req.params.id]);
    res.json({ success: true, statut });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { numero, bloc_id, etage, type, capacite_max } = req.body;
    if (!numero || !bloc_id || !etage || !type) {
      return res.status(400).json({ error: 'numero, bloc_id, etage et type sont obligatoires' });
    }
    const bloc = await db.get("SELECT * FROM blocs WHERE id = $1", [bloc_id]);
    if (!bloc) return res.status(404).json({ error: 'Bloc introuvable' });

    await db.run(
      "INSERT INTO chambres (numero, bloc, bloc_id, etage, type, capacite_max, statut) VALUES ($1, $2, $3, $4, $5, $6, 'libre')",
      [numero, bloc.code, bloc_id, etage, type, capacite_max || 1]
    );
    const { logAction } = require('../middleware/auditLogger.cjs');
    await logAction(req.agent.id, 'CREATION_CHAMBRE', 'chambres', null, { numero, bloc_id, type });
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/bulk-update', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { roomIds, updates } = req.body;
    if (!roomIds || !roomIds.length || !updates) {
       return res.status(400).json({ error: 'roomIds (array) and updates (object) required' });
    }
    
    await db.transaction(async (client) => {
      for (const roomId of roomIds) {
         const setCols = [];
         const args = [];
         let argIdx = 1;

         if (updates.type) { setCols.push(`type=$${argIdx++}`); args.push(updates.type); }
         if (updates.capacite_max !== undefined) { setCols.push(`capacite_max=$${argIdx++}`); args.push(updates.capacite_max); }
         
         if (setCols.length > 0) {
           args.push(roomId);
           await client.query(`UPDATE chambres SET ${setCols.join(', ')} WHERE id=$${argIdx}`, args);
         }
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-delete', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { roomIds } = req.body;
    if (!roomIds || !roomIds.length) {
       return res.status(400).json({ error: 'roomIds missing' });
    }
    
    await db.transaction(async (client) => {
      for (const roomId of roomIds) {
         await client.query("DELETE FROM chambres WHERE id = $1", [roomId]);
      }
    });
    
    const { logAction } = require('../middleware/auditLogger.cjs');
    await logAction(req.agent.id, 'SUPPRESSION_CHAMBRES_MASSE', 'chambres', null, { roomIds });
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('violates foreign key constraint')) {
       return res.status(400).json({ error: 'Certaines chambres ne peuvent pas être supprimées car elles sont liées à des réservations ou d\'autres enregistrements.' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.query("DELETE FROM chambres WHERE id = $1", [req.params.id]);
    const { logAction } = require('../middleware/auditLogger.cjs');
    await logAction(req.agent.id, 'SUPPRESSION_CHAMBRE', 'chambres', req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('violates foreign key constraint')) {
       return res.status(400).json({ error: 'La chambre ne peut pas être supprimée car elle est liée à une réservation.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
