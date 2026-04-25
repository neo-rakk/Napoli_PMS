'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET;

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

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // In development or if origin is allowed, proceed
    if (!origin || (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Non autorisé par CORS'));
  },
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
// app.use('/api/clients',         require('./routes/clients.cjs'));
// ... autres routes

// API healthcheck pour valider le serveur
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).+/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

module.exports = app;
