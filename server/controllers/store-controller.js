// server/controllers/store-controller.js
const auth = require('../auth');
const db = require('../db'); // DB-agnostic manager (Mongo or Postgres)

/**
 * Helpers to normalize data so the legacy React client never crashes.
 */
function normalizeSong(s) {
  if (!s) return { title: '', artist: '', year: null, youTubeId: null };
  return {
    title: s.title,
    artist: s.artist,
    year: s.year ?? null,
    youTubeId: s.youTubeId ?? s.youtubeId ?? null,
  };
}

function normalizePlaylist(raw) {
  if (!raw) return null;
  const songsRaw = raw.songs ?? raw.Songs ?? [];
  return {
    _id: String(raw._id ?? raw.id),
    name: raw.name,
    ownerEmail: raw.ownerEmail,
    songs: songsRaw.map(normalizeSong)
  };
}

function normalizePairs(pairs) {
  return (pairs || []).map(p => ({
    _id: String(p._id ?? p.id),
    name: p.name
  }));
}

/**
 * CREATE
 */
createPlaylist = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  const body = req.body || {};
  try {
    const me = await db.getUserById(String(req.userId));
    if (!me) return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });

    const name = body.name ?? body.playlist?.name;
    const ownerEmail = body.ownerEmail ?? me.email;
    const songsIn = body.songs ?? body.playlist?.songs ?? [];
    if (!name) return res.status(400).json({ success: false, error: 'Playlist name is required' });

    const created = await db.createPlaylist({ name, songs: songsIn, ownerEmail });
    return res.status(201).json({ playlist: normalizePlaylist(created) });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ errorMessage: 'Playlist Not Created!' });
  }
};

/**
 * DELETE
 */
deletePlaylist = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  const id = req.params.id;
  try {
    const playlist = await db.getPlaylistById(id);
    if (!playlist) return res.status(404).json({ errorMessage: 'Playlist not found!' });

    // Ownership check via ownerEmail
    const owner = await db.getUserByEmail(playlist.ownerEmail);
    if (!owner || String(owner._id ?? owner.id) !== String(req.userId)) {
      return res.status(400).json({ errorMessage: 'authentication error' });
    }

    const ok = await db.deletePlaylistById(id);
    return res.status(ok ? 200 : 404).json(ok ? {} : { errorMessage: 'Playlist not found!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errorMessage: 'Server error' });
  }
};

/**
 * READ (single)
 */
getPlaylistById = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  const id = req.params.id;
  try {
    const raw = await db.getPlaylistById(id);
    if (!raw) return res.status(400).json({ success: false, error: 'Playlist not found' });

    // Ownership check
    const owner = await db.getUserByEmail(raw.ownerEmail);
    if (!owner || String(owner._id ?? owner.id) !== String(req.userId)) {
      return res.status(400).json({ success: false, description: 'authentication error' });
    }

    return res.status(200).json({ success: true, playlist: normalizePlaylist(raw) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * READ (pairs for current user)
 * Always returns success:true and an array (possibly empty).
 */
getPlaylistPairs = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  try {
    const user = await db.getUserById(String(req.userId));
    if (!user) return res.status(200).json({ success: true, idNamePairs: [] });

    const allPairs = await db.getPlaylistPairs(); // [{ id/_id, name, ownerEmail }]
    const myPairs = (allPairs || []).filter(p => p.ownerEmail === user.email);

    return res.status(200).json({ success: true, idNamePairs: normalizePairs(myPairs) });
  } catch (err) {
    console.error(err);
    // Safe fallback to keep client happy
    return res.status(200).json({ success: true, idNamePairs: [] });
  }
};

/**
 * READ (all playlists)
 * Built from pairs; returns empty list instead of 404.
 */
getPlaylists = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  try {
    const pairs = await db.getPlaylistPairs();
    const full = [];
    for (const p of (pairs || [])) {
      const id = String(p._id ?? p.id);
      const pl = await db.getPlaylistById(id);
      if (pl) full.push(normalizePlaylist(pl));
    }
    return res.status(200).json({ success: true, data: full });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ success: true, data: [] });
  }
};

/**
 * UPDATE
 */
updatePlaylist = async (req, res) => {
  if (auth.verifyUser(req) === null) {
    return res.status(400).json({ errorMessage: 'UNAUTHORIZED' });
  }

  const id = String(req.params.id);
  const body = req.body || {};
  if (!body.playlist) {
    return res.status(400).json({ success: false, error: 'You must provide a body to update' });
  }

  try {
    const current = await db.getPlaylistById(id);
    if (!current) return res.status(404).json({ message: 'Playlist not found!' });

    // Ownership check
    const owner = await db.getUserByEmail(current.ownerEmail);
    if (!owner || String(owner._id ?? owner.id) !== String(req.userId)) {
      return res.status(400).json({ success: false, description: 'authentication error' });
    }

    const next = {
      name: body.playlist.name ?? current.name,
      ownerEmail: current.ownerEmail,
      songs: body.playlist.songs ?? []
    };

    const updated = await db.updatePlaylistById(id, next);
    if (!updated) return res.status(404).json({ error: 'Playlist not updated!' });

    return res.status(200).json({
      success: true,
      id: String(updated._id ?? updated.id),
      message: 'Playlist updated!',
    });
  } catch (error) {
    console.log('FAILURE:', JSON.stringify(error));
    return res.status(404).json({ error, message: 'Playlist not updated!' });
  }
};

module.exports = {
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getPlaylistPairs,
  getPlaylists,
  updatePlaylist
};
