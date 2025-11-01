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

async function resetMongo() {
    const Playlist = require('../../../models/playlist-model');
    const User = require('../../../models/user-model');
    const testData = require('../example-db-data.json');

    console.log("Resetting the Mongo DB");
    await clearCollection(Playlist, "Playlist");
    await clearCollection(User, "User");
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
