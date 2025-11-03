// server/test/data/postgre/index.js
// Reset PostgreSQL to known data using Sequelize (no app server required)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { Sequelize, DataTypes } = require('sequelize');

// ---- JSON data ----
const baseData = require('../example-db-data.json');
const rayData  = require('../my-db-data.json'); // your playlists

// ---- Helper: combine data just like Mongo ----
function uniqBy(arr, fn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = fn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function combineSeedData() {
  const playlists = uniqBy(
    [...(baseData.playlists || []), ...(rayData.playlists || [])],
    p => String(p._id || p.name).toLowerCase()
  );

  const users = uniqBy(
    [...(baseData.users || []), ...(rayData.users || [])],
    u => String(u.email).toLowerCase()
  );

  return { users, playlists };
}

// ---- Build config safely (no URL parsing issues) ----
function getPgConfig() {
  return {
    database: process.env.PG_DATABASE || 'playlister',
    username: process.env.PG_USER     || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host:     process.env.PG_HOST     || '127.0.0.1',
    port:     Number(process.env.PG_PORT || 5432),
    dialect:  'postgres',
    logging:  false,
  };
}

async function run() {
  const cfg = getPgConfig();
  const sequelize = new Sequelize(cfg);

  const User = sequelize.define('User', {
    firstName:    { type: DataTypes.STRING, allowNull: false, field: 'first_name' },
    lastName:     { type: DataTypes.STRING, allowNull: false, field: 'last_name' },
    email:        { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
  }, { tableName: 'users', underscored: true });

  const Playlist = sequelize.define('Playlist', {
    name:       { type: DataTypes.STRING, allowNull: false },
    ownerEmail: { type: DataTypes.STRING, allowNull: true, field: 'owner_email' },
  }, { tableName: 'playlists', underscored: true });

  const Song = sequelize.define('Song', {
    title:     { type: DataTypes.STRING, allowNull: false },
    artist:    { type: DataTypes.STRING, allowNull: false },
    year:      { type: DataTypes.INTEGER, allowNull: true },
    youTubeId: { type: DataTypes.STRING, allowNull: true, field: 'youtube_id' },
  }, { tableName: 'songs', underscored: true });

  User.hasMany(Playlist, { foreignKey: { name: 'owner_user_id', allowNull: false }, onDelete: 'CASCADE' });
  Playlist.belongsTo(User, { as: 'owner', foreignKey: { name: 'owner_user_id', allowNull: false } });
  Playlist.hasMany(Song, { foreignKey: { name: 'playlist_id', allowNull: false }, onDelete: 'CASCADE' });
  Song.belongsTo(Playlist, { foreignKey: { name: 'playlist_id', allowNull: false } });

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // drop & recreate tables
    console.log('✅ [Postgres] Connected & tables recreated');

    const seedData = combineSeedData();

    // ---- Insert Users and Playlists ----
    const emailToUser = {};
    for (const u of seedData.users) {
      const created = await User.create({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash: u.passwordHash
      });
      emailToUser[u.email] = created;
    }

    for (const p of seedData.playlists) {
      const owner = emailToUser[p.ownerEmail] || await User.findOne({ where: { email: p.ownerEmail } });
      if (!owner) throw new Error(`Owner not found for playlist: ${p.name}`);

      const pl = await Playlist.create({
        name: p.name,
        ownerEmail: p.ownerEmail,
        owner_user_id: owner.id
      });

      for (const s of (p.songs || [])) {
        await Song.create({
          title: s.title,
          artist: s.artist,
          year: s.year ?? null,
          youTubeId: s.youTubeId ?? null,
          playlist_id: pl.id
        });
      }
    }

    console.log('🎉 PostgreSQL reset complete with combined data!');
  } catch (e) {
    console.error('Seeder error:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

run();
