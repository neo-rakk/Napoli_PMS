'use strict';
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const requireAuth = (req, res, next) => {
  if (!JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET manquant sur le serveur' });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    req.agent = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expirée ou token invalide' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.agent || !roles.includes(req.agent.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
