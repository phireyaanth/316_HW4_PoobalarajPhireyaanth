// server/db/mongodb/index.js
const mongoose = require('mongoose');
const DatabaseManager = require('../DatabaseManager');

// Reuse your existing Mongoose models
const User = require('../../models/user-model');
const Playlist = require('../../models/playlist-model');

console.log("[DEBUG] MongoDBManager loaded");


class MongoDBManager extends DatabaseManager {
  async init() {
    const uri =
      process.env.DB_CONNECT ||
      process.env.MONGO_URI ||
      'mongodb://127.0.0.1:27017/playlister';

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ [Mongo] Connected at:', uri);
  }

  async close() {
    await mongoose.connection.close();
  }

  // ---------- Users ----------
  async getUserById(id) {
    const u = await User.findById(id).lean();
    return u || null;
  }

  async getUserByEmail(email) {
    const u = await User.findOne({ email }).lean();
    return u || null;
  }

  async createUser({ firstName, lastName, email, passwordHash }) {
    const doc = await User.create({ firstName, lastName, email, passwordHash, playlists: [] });
    return doc.toObject();
  }

  // ---------- Playlists ----------
  async createPlaylist({ name, songs, ownerEmail }) {
    const doc = await Playlist.create({ name, songs, ownerEmail });
    return doc.toObject();
  }

  async getPlaylistById(id) {
    const pl = await Playlist.findById(id).lean();
    return pl || null;
  }

  async getPlaylistPairs() {
    // Return { _id, name, ownerEmail }
    const rows = await Playlist.find({}, { name: 1, ownerEmail: 1 }).lean();
    return rows || [];
  }

  async updatePlaylistById(id, playlist) {
    const updated = await Playlist.findByIdAndUpdate(
      id,
      { $set: { name: playlist.name, songs: playlist.songs, ownerEmail: playlist.ownerEmail } },
      { new: true }
    ).lean();
    return updated || null;
  }

  async deletePlaylistById(id) {
    const deleted = await Playlist.findByIdAndDelete(id).lean();
    return !!deleted;
  }
}

module.exports = new MongoDBManager();
