// server/db/postgresql/index.js
const { Sequelize, DataTypes } = require('sequelize');
const DatabaseManager = require('../DatabaseManager');

console.log('[DEBUG] PostgreSQLManager loaded');

let sequelize;
let User, Playlist, Song;

/**
 * Resolve connection settings from environment.
 * Supports:
 *   - POSTGRES_URI (full DSN)
 *   - PG_*   (PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD)
 *   - POSTGRES_* (POSTGRES_HOST/PORT/DB/USER/PASSWORD)
 */
function getPgConfig() {
  if (process.env.POSTGRES_URI) {
    return { dsn: process.env.POSTGRES_URI };
  }

  // Prefer PG_* names, fall back to POSTGRES_*
  const host = process.env.PG_HOST || process.env.POSTGRES_HOST || '127.0.0.1';
  const port = process.env.PG_PORT || process.env.POSTGRES_PORT || '5432';
  const database =
    process.env.PG_DATABASE || process.env.POSTGRES_DB || 'playlister';
  const username =
    process.env.PG_USER || process.env.POSTGRES_USER || 'postgres';
  const password =
    process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';

  return { host, port, database, username, password };
}

function defineModels() {
  User = sequelize.define(
    'User',
    {
      firstName: { type: DataTypes.STRING, allowNull: false, field: 'first_name' },
      lastName:  { type: DataTypes.STRING, allowNull: false, field: 'last_name' },
      email:     { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
    },
    { tableName: 'users', underscored: true }
  );

  // Keep ownerEmail for compatibility with your app
  Playlist = sequelize.define(
    'Playlist',
    {
      name:       { type: DataTypes.STRING, allowNull: false },
      ownerEmail: { type: DataTypes.STRING, allowNull: true, field: 'owner_email' },
    },
    { tableName: 'playlists', underscored: true }
  );

  Song = sequelize.define(
    'Song',
    {
      title:    { type: DataTypes.STRING, allowNull: false },
      artist:   { type: DataTypes.STRING, allowNull: false },
      year:     { type: DataTypes.INTEGER, allowNull: true },
      youTubeId:{ type: DataTypes.STRING, allowNull: true, field: 'youtube_id' },
    },
    { tableName: 'songs', underscored: true }
  );

  // Relations:
  // User 1—* Playlists
  User.hasMany(Playlist, {
    foreignKey: { name: 'owner_user_id', allowNull: false },
    onDelete: 'CASCADE',
  });
  Playlist.belongsTo(User, {
    as: 'owner',
    foreignKey: { name: 'owner_user_id', allowNull: false },
  });

  // Playlist 1—* Songs
  Playlist.hasMany(Song, {
    foreignKey: { name: 'playlist_id', allowNull: false },
    onDelete: 'CASCADE',
  });
  Song.belongsTo(Playlist, {
    foreignKey: { name: 'playlist_id', allowNull: false },
  });
}

class PostgresDBManager extends DatabaseManager {
  async init() {
    const cfg = getPgConfig();

    if (cfg.dsn) {
      sequelize = new Sequelize(cfg.dsn, { logging: false });
    } else {
      sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
        host: cfg.host,
        port: cfg.port,
        dialect: 'postgres',
        logging: false,
      });
    }

    await sequelize.authenticate();
    defineModels();
    // Non-destructive; tables are created if missing
    await sequelize.sync();
    console.log(`✅ [Postgres] Connected & models ready`);
  }

  async close() {
    if (sequelize) await sequelize.close();
  }

  // ---------- Users ----------
  async getUserById(id) {
    const row = await User.findByPk(id);
    return row ? row.get({ plain: true }) : null;
  }

  async getUserByEmail(email) {
    const row = await User.findOne({ where: { email } });
    return row ? row.get({ plain: true }) : null;
  }

  async createUser({ firstName, lastName, email, passwordHash }) {
    const created = await User.create({ firstName, lastName, email, passwordHash });
    return created.get({ plain: true });
  }

  // ---------- Playlists ----------
  async createPlaylist({ name, songs, ownerEmail }) {
    // find owner by email
    const owner = await User.findOne({ where: { email: ownerEmail } });
    if (!owner) throw new Error(`Owner with email ${ownerEmail} not found`);

    const tx = await sequelize.transaction();
    try {
      const pl = await Playlist.create(
        { name, ownerEmail, owner_user_id: owner.id },
        { transaction: tx }
      );

      if (Array.isArray(songs) && songs.length) {
        const rows = songs.map((s) => ({
          title: s.title,
          artist: s.artist,
          year: s.year ?? null,
          youTubeId: s.youTubeId ?? null,
          playlist_id: pl.id,
        }));
        await Song.bulkCreate(rows, { transaction: tx });
      }

      await tx.commit();

      const full = await Playlist.findByPk(pl.id, { include: [Song] });
      return full.get({ plain: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async getPlaylistById(id) {
    const pl = await Playlist.findByPk(id, { include: [Song] });
    return pl ? pl.get({ plain: true }) : null;
  }

  async getPlaylistPairs() {
    const rows = await Playlist.findAll({
      attributes: ['id', 'name', 'ownerEmail'],
      order: [['id', 'ASC']],
    });

    // If your client still expects {_id, name}, map it here:
    return rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        _id: String(plain.id), // keep client compatibility
        name: plain.name,
        ownerEmail: plain.ownerEmail,
      };
    });
  }

  async updatePlaylistById(id, playlist) {
    const tx = await sequelize.transaction();
    try {
      // Update basic fields
      await Playlist.update(
        {
          name: playlist.name,
          ownerEmail: playlist.ownerEmail ?? null,
        },
        { where: { id }, transaction: tx }
      );

      // Replace songs (simpler & safe)
      await Song.destroy({ where: { playlist_id: id }, transaction: tx });

      if (Array.isArray(playlist.songs) && playlist.songs.length) {
        const rows = playlist.songs.map((s) => ({
          title: s.title,
          artist: s.artist,
          year: s.year ?? null,
          youTubeId: s.youTubeId ?? null,
          playlist_id: id,
        }));
        await Song.bulkCreate(rows, { transaction: tx });
      }

      await tx.commit();

      const full = await Playlist.findByPk(id, { include: [Song] });
      return full ? full.get({ plain: true }) : null;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async deletePlaylistById(id) {
    const n = await Playlist.destroy({ where: { id } });
    return n > 0;
  }
}

module.exports = new PostgresDBManager();
