// server/db/index.js
require('dotenv').config();
console.log("[DEBUG] DB_PROVIDER =", process.env.DB_PROVIDER);

let db;
const provider = (process.env.DB_PROVIDER || 'mongodb').toLowerCase();

if (provider === 'postgresql' || provider === 'postgres') {
  console.log('[DB] Using PostgreSQL DatabaseManager');
  db = require('./postgresql');
} else {
  console.log('[DB] Using MongoDB DatabaseManager');
  db = require('./mongodb');
}

module.exports = db;
