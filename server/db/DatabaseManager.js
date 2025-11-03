// server/db/DatabaseManager.js
// This is a documentation stub of the interface the controllers will call.

class DatabaseManager {
  // lifecycle
  async init() {}
  async close() {}

  // users
  async getUserById(id) {}
  async getUserByEmail(email) {}
  async createUser({ firstName, lastName, email, passwordHash }) {}

  // playlists
  async createPlaylist({ name, songs, ownerEmail }) {}
  async getPlaylistById(id) {}
  async getPlaylistPairs() {} // return [{ _id/id, name, ownerEmail }, ...]
  async updatePlaylistById(id, playlist) {}
  async deletePlaylistById(id) {}
}

module.exports = DatabaseManager;
