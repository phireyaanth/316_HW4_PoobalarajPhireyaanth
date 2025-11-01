/*
    This is our http api, which we use to send requests to
    our back-end API. Note we`re using the  library
    for doing this, which is an easy to use AJAX-based
    library. We could (and maybe should) use Fetch, which
    is a native (to browsers) standard, but  is easier
    to use when sending JSON back and forth and it`s a Promise-
    based API which helps a lot with asynchronous communication.
    
    @author McKilla Gorilla
*/

// client/src/store/requests/index.js
const BASE_URL = 'http://localhost:4000/store';

// POST /playlist
export const createPlaylist = async (newListName, newSongs, userEmail) => {
  const res = await fetch(`${BASE_URL}/playlist/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newListName, songs: newSongs, ownerEmail: userEmail }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

// DELETE /playlist/:id
export const deletePlaylistById = async (id) => {
  const res = await fetch(`${BASE_URL}/playlist/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

// GET /playlist/:id
export const getPlaylistById = async (id) => {
  const res = await fetch(`${BASE_URL}/playlist/${id}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

// GET /playlistpairs
export const getPlaylistPairs = async () => {
  const res = await fetch(`${BASE_URL}/playlistpairs/`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

// PUT /playlist/:id
export const updatePlaylistById = async (id, playlist) => {
  const res = await fetch(`${BASE_URL}/playlist/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlist }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

const apis = {
  createPlaylist,
  deletePlaylistById,
  getPlaylistById,
  getPlaylistPairs,
  updatePlaylistById,
};
export default apis;
