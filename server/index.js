// ===============================
//  Playlister Server (Refactored)
// ===============================

// Node/Express dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Create our server
const PORT = process.env.PORT || 4000;
const app = express();

// ---------- MIDDLEWARE ----------
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ---------- ROUTERS ----------
const authRouter = require('./routes/auth-router');
const storeRouter = require('./routes/store-router');
app.use('/auth', authRouter);
app.use('/store', storeRouter);

// ---------- DATABASE INITIALIZATION ----------
const db = require('./db');

(async () => {
  try {
    await db.init(); // Connects to MongoDB or PostgreSQL depending on .env
    console.log(`✅ Database initialized using provider: ${process.env.DB_PROVIDER || 'mongodb'}`);
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }
})();

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🎧 Playlister Server running on port ${PORT}`);
});
