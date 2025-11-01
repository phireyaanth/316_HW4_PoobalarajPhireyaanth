/**
 * Playlister Server - HW4
 * ------------------------
 * This is the main server entry point.
 * It connects to MongoDB using DB_CONNECT from .env
 * and starts the Express server on PORT.
 */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

// 🔹 Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB using DB_CONNECT from .env
const uri =
  process.env.DB_CONNECT ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/playlister';

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB at:', uri);

    // Once DB is connected, start the server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🎧 Playlister Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// 🔹 Example route (optional sanity check)
app.get('/', (req, res) => {
  res.send('Playlister backend is running!');
});

// Export app if you need it for testing
module.exports = app;
