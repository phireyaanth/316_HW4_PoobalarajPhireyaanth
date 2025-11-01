const dotenv = require('dotenv').config({ path: __dirname + '/../../../.env' });

async function clearCollection(collection, collectionName) {
    try {
        await collection.deleteMany({});
        console.log(collectionName + " cleared");
    } catch (err) {
        console.log(err);
    }
}

async function fillCollection(collection, collectionName, data) {
    for (let i = 0; i < data.length; i++) {
        let doc = new collection(data[i]);
        await doc.save();
    }
    console.log(collectionName + " filled");
}

// --- helpers to merge & dedupe ---
function uniqBy(arr, keyFn) {
    const seen = new Set();
    const out = [];
    for (const item of arr || []) {
        const k = keyFn(item);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(item);
        }
    }
    return out;
}

function combineSeedData() {
    const base = require('../example-db-data.json');        // Joe/Jane + playlists
    const ray  = require('../my-db-data.json');            

    const playlists = uniqBy(
        [...(base.playlists || []), ...(ray.playlists || [])],
        p => String(p._id).toLowerCase()
    );

    const users = uniqBy(
        [...(base.users || []), ...(ray.users || [])],
        u => String(u.email).toLowerCase()
    );

    return { users, playlists };
}

async function resetMongo() {
    const Playlist = require('../../../models/playlist-model');
    const User = require('../../../models/user-model');

    // merge both files
    const testData = combineSeedData();

    console.log("Resetting the Mongo DB");
    await clearCollection(Playlist, "Playlist");
    await clearCollection(User, "User");

    // order matters: playlists first, then users
    await fillCollection(Playlist, "Playlist", testData.playlists);
    await fillCollection(User, "User", testData.users);
}

const mongoose = require('mongoose');

mongoose
  .connect(process.env.DB_CONNECT, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
      console.log("Connected to MongoDB at:", process.env.DB_CONNECT);
      try {
          await resetMongo();
          console.log("✅ Mongo reset complete!");
      } catch (e) {
          console.error("Seeder error:", e.message);
      } finally {
          await mongoose.connection.close();
          console.log("Database seeding finished.");
          process.exit(0);
      }
  })
  .catch(e => {
      console.error('Connection error', e.message);
      process.exit(1);
  });
