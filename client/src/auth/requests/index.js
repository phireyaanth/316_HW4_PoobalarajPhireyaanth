/*
    This is our http api for all things auth, which we use to 
    send authorization requests to our back-end API. Note we`re 
    using the  library for doing this, which is an easy to 
    use AJAX-based library. We could (and maybe should) use Fetch, 
    which is a native (to browsers) standard, but  is easier
    to use when sending JSON back and forth and it`s a Promise-
    based API which helps a lot with asynchronous communication.
    
    @author McKilla Gorilla
*/
// client/src/auth/requests/index.js
const BASE_URL = 'http://localhost:4000/auth';

// GET /loggedIn
export const getLoggedIn = async () => {
  const res = await fetch(`${BASE_URL}/loggedIn/`, {
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

// POST /login
export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

// GET /logout
export const logoutUser = async () => {
  const res = await fetch(`${BASE_URL}/logout/`, {
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

// POST /register
export const registerUser = async (firstName, lastName, email, password, passwordVerify) => {
  const res = await fetch(`${BASE_URL}/register/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password, passwordVerify }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data, status: res.status };
};

const apis = { getLoggedIn, registerUser, loginUser, logoutUser };
export default apis;
