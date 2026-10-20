import api, { setAuthToken, setSavedUser } from './client';

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { username, email, password }
 */
export async function register(userData) {
  const data = await api.post('/auth/register', userData);
  if (data?.token) {
    setAuthToken(data.token);
    setSavedUser(data.user);
  }
  return data;
}

/**
 * Login with username/email and password
 * POST /api/auth/login
 * Body: { identifier, password }
 */
export async function login(credentials) {
  const data = await api.post('/auth/login', credentials);
  if (data?.token) {
    setAuthToken(data.token);
    setSavedUser(data.user);
  }
  return data;
}

/**
 * Logout and clear local session
 * POST /api/auth/logout
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAuthToken(null);
    setSavedUser(null);
  }
}

/**
 * Refresh current JWT token
 * POST /api/auth/refresh-token
 */
export async function refreshToken() {
  const data = await api.post('/auth/refresh-token');
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

/**
 * Get currently authenticated user
 * GET /api/auth/me
 */
export async function getAuthMe() {
  return api.get('/auth/me');
}

