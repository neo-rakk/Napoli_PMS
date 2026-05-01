'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'votre-secret-local-dev';
// if (!JWT_SECRET) throw new Error('[FATAL] JWT_SECRET manquant');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: true, // Autorise de façon dynamique toutes les requêtes (nécessaire pour environnement dev cloud)
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', globalLimiter);

const inscriptionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/clients', (req, res, next) => {
  if (req.method === 'POST' && !req.headers.authorization) return inscriptionLimiter(req, res, next);
  next();
});

// Appeler les routes
app.use('/api/agents', require('./routes/agents.cjs'));
app.use('/api/clients', require('./routes/clients.cjs'));
app.use('/api/stats', require('./routes/stats.cjs'));
app.use('/api/chambres', require('./routes/chambres.cjs'));
app.use('/api/groupes', require('./routes/groupes.cjs'));
app.use('/api/comptes', require('./routes/comptes.cjs'));
app.use('/api/tarifs', require('./routes/tarifs.cjs'));
app.use('/api/contrats', require('./routes/contrats.cjs'));
app.use('/api/reservations', require('./routes/reservations.cjs'));
app.use('/api/blocs', require('./routes/blocs.cjs'));
app.use('/api/housekeeping', require('./routes/housekeeping.cjs'));
app.use('/api/sessions-caisse', require('./routes/sessionsCaisse.cjs'));
app.use('/api/presences', require('./routes/presences.cjs'));
app.use('/api/audit', require('./routes/audit.cjs'));
app.use('/api/encaissements', require('./routes/encaissements.cjs'));
app.use('/api/maintenance', require('./routes/maintenance.cjs'));
app.use('/api/pos', require('./routes/pos.cjs'));
app.use('/api/stocks', require('./routes/stocks.cjs'));
// ... autres routes

// API healthcheck pour valider le serveur
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route non trouvée: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({ error: err.message || 'Erreur serveur interne' });
});

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).+/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

module.exports = app;
