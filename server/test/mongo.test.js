import { beforeAll, beforeEach, afterEach, afterAll, expect, test } from 'vitest';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// IMPORTANT: for these tests, make sure .env has DB_PROVIDER=mongodb
// and DB_CONNECT points to your Mongo instance (e.g., mongodb://127.0.0.1:27017/playlister)

const bcrypt = require('bcryptjs');

// We will test THROUGH the DB abstraction so the same tests can work for Postgres later
const db = require('../db'); // resolves to server/db/index.js which selects provider by .env

/**
 * Vitest test script for the Playlister app's Mongo Database Manager. Testing should verify that the Mongo Database Manager 
 * will perform all necessarily operations properly.
 *  
 * Scenarios we will test:
 *  1) Reading a User from the database
 *  2) Creating a User in the database
 *  3) ...
 * 
 * You should add at least one test for each database interaction. In the real world of course we would do many varied
 * tests for each interaction.
 */

/**
 * Executed once before all tests are performed.
 */
beforeAll(async () => {
    // SETUP THE CONNECTION VIA MONGOOSE JUST ONCE - IT IS IMPORTANT TO NOTE THAT INSTEAD
    // OF DOING THIS HERE, IT SHOULD BE DONE INSIDE YOUR Database Manager (WHICHEVER)
    //
    // We call db.init() which, under Mongo, connects with Mongoose.
    if (process.env.DB_PROVIDER !== 'mongodb') {
        throw new Error('These tests expect DB_PROVIDER=mongodb in server/.env');
    }
    await db.init();
});

/**
 * Executed before each test is performed.
 */
beforeEach(() => {
});

/**
 * Executed after each test is performed.
 */
afterEach(() => {
});

/**
 * Executed once after all tests are performed.
 */
afterAll(async () => {
    await db.close();
});

/**
 * Helper: make a unique email per run so tests don’t collide.
 */
function uniqueEmail(prefix = 'vitest.user') {
    const ts = Date.now();
    return `${prefix}.${ts}@example.com`;
}

/**
 * Vitest test to see if the Database Manager can get a User.
 */
test('Test #1) Reading a User from the Database', async () => {
    // FILL IN A USER WITH THE DATA YOU EXPECT THEM TO HAVE
    const expectedUser = {
        // Using seed data from example-db-data.json (Joe Shmo)
        firstName: 'Joe',
        lastName: 'Shmo',
        email: 'joe@shmo.com'
    };

    // THIS WILL STORE THE DATA RETRUNED BY A READ USER
    // READ THE USER
    const actualUser = await db.getUserByEmail(expectedUser.email);

    // COMPARE THE VALUES OF THE EXPECTED USER TO THE ACTUAL ONE
    expect(actualUser).toBeTruthy();
    expect(actualUser.firstName).toBe(expectedUser.firstName);
    expect(actualUser.lastName).toBe(expectedUser.lastName);
    expect(actualUser.email).toBe(expectedUser.email);
});

/**
 * Vitest test to see if the Database Manager can create a User
 */
test('Test #2) Creating a User in the Database', async () => {
    // MAKE A TEST USER TO CREATE IN THE DATABASE
    const email = uniqueEmail('create.user');
    const passwordHash = await bcrypt.hash('aaaaaaaa', 10);
    const testUser = {
        firstName: 'Create',
        lastName: 'User',
        email,
        passwordHash
    };

    // CREATE THE USER
    const created = await db.createUser(testUser);
    expect(created).toBeTruthy();
    expect(created.email).toBe(email);

    // NEXT TEST TO SEE IF IT WAS PROPERLY CREATED
    const expectedUser = {
        firstName: 'Create',
        lastName: 'User',
        email
    };

    // THIS WILL STORE THE DATA RETRUNED BY A READ USER
    // READ THE USER
    const actualUser = await db.getUserByEmail(email);

    // COMPARE THE VALUES OF THE EXPECTED USER TO THE ACTUAL ONE
    expect(actualUser).toBeTruthy();
    expect(actualUser.firstName).toBe(expectedUser.firstName);
    expect(actualUser.lastName).toBe(expectedUser.lastName);
    expect(actualUser.email).toBe(expectedUser.email);
});

// ---------- Extra tests (one per DB operation) ----------

test('Test #3) Creating a Playlist', async () => {
    // Use Joe as the owner (seeded)
    const owner = await db.getUserByEmail('joe@shmo.com');
    expect(owner).toBeTruthy();

    const created = await db.createPlaylist({
        name: 'Vitest List',
        ownerEmail: owner.email,
        songs: [
            { title: 'Song A', artist: 'Artist A', year: 2001, youTubeId: 'AAA111' },
            { title: 'Song B', artist: 'Artist B', year: 2002, youTubeId: 'BBB222' }
        ]
    });

    expect(created).toBeTruthy();
    expect(created.name).toBe('Vitest List');
    expect(created.songs?.length ?? created.Songs?.length).toBe(2);
});

test('Test #4) Getting a Playlist by ID', async () => {
    const owner = await db.getUserByEmail('joe@shmo.com');
    const pl = await db.createPlaylist({
        name: 'To Read Back',
        ownerEmail: owner.email,
        songs: [{ title: 'Only One', artist: 'Someone', year: 1999, youTubeId: 'ONE1' }]
    });

    const id = String(pl._id || pl.id);
    const fetched = await db.getPlaylistById(id);

    expect(fetched).toBeTruthy();
    expect(fetched.name).toBe('To Read Back');
    expect((fetched.songs ?? fetched.Songs).length).toBe(1);
});

test('Test #5) Updating a Playlist by ID', async () => {
    const owner = await db.getUserByEmail('joe@shmo.com');
    const pl = await db.createPlaylist({
        name: 'Before Update',
        ownerEmail: owner.email,
        songs: [{ title: 'Old', artist: 'X', year: 1990, youTubeId: 'OLD' }]
    });

    const id = String(pl._id || pl.id);

    const updated = await db.updatePlaylistById(id, {
        name: 'After Update',
        ownerEmail: owner.email,
        songs: [
            { title: 'New 1', artist: 'Y', year: 2020, youTubeId: 'NEW1' },
            { title: 'New 2', artist: 'Z', year: 2021, youTubeId: 'NEW2' }
        ]
    });

    expect(updated).toBeTruthy();
    expect(updated.name).toBe('After Update');
    expect((updated.songs ?? updated.Songs).length).toBe(2);
});

test('Test #6) Getting Playlist Pairs', async () => {
    const pairs = await db.getPlaylistPairs();
    expect(Array.isArray(pairs)).toBe(true);
    // Each pair has id/_id and name; ownerEmail may be present depending on DB manager
    if (pairs.length > 0) {
        const p = pairs[0];
        expect(p.name).toBeTruthy();
        expect(p._id || p.id).toBeTruthy();
    }
});

test('Test #7) Deleting a Playlist by ID', async () => {
    const owner = await db.getUserByEmail('joe@shmo.com');
    const pl = await db.createPlaylist({
        name: 'To Delete',
        ownerEmail: owner.email,
        songs: []
    });

    const id = String(pl._id || pl.id);
    const ok = await db.deletePlaylistById(id);
    expect(ok).toBe(true);

    const again = await db.getPlaylistById(id);
    expect(again).toBeFalsy();
});
