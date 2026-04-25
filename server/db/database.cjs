'use strict';
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

if (!connectionString && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
  throw new Error('POSTGRES_URL_NON_POOLING manquant en production');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
});

const db = {
  query: (text, params) => pool.query(text, params),
  all: async (text, params = []) => { const res = await pool.query(text, params); return res.rows; },
  get: async (text, params = []) => { const res = await pool.query(text, params); return res.rows[0] || null; },
  run: async (text, params = []) => { const res = await pool.query(text, params); return { rowCount: res.rowCount, lastId: res.rows[0]?.id || null }; },
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

module.exports = db;
