'use strict';
const db = require('../db/database.cjs');

async function logAction(agent_id, action, table_cible, enregistrement_id, details = {}, ip_address = null) {
  try {
    await db.query(`
      INSERT INTO audit_log (agent_id, action, table_cible, enregistrement_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      agent_id || null, 
      action, 
      table_cible || null, 
      enregistrement_id || null, 
      JSON.stringify(details), 
      ip_address
    ]);
  } catch (error) {
    console.error('Erreur Audit Log:', error);
  }
}

module.exports = { logAction };
