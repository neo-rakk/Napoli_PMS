'use strict';
require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'votre-secret-local-dev');
console.log(token);
