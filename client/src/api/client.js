/**
 * StudySync Centralized API Client.
 *
 * Configured using VITE_API_BASE_URL (defaults to http://localhost:5000/api).
 * Injects JWT Bearer token into headers when available.
 * Standardizes API responses and errors.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Standard API Error wrapper
 */
export class ApiError extends Error {
  constructor(message, status, details = null, raw = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.raw = raw;
  }
}

/**
 * Helper to get the saved auth token from localStorage
 */
export function getAuthToken() {
  return localStorage.getItem('studysync_token') || localStorage.getItem('token') || null;
}

/**
 * Helper to set the auth token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('studysync_token', token);
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('studysync_token');
    localStorage.removeItem('token');
  }
}

/**
 * Helper to get saved user info from localStorage
 */
export function getSavedUser() {
  try {
    const raw = localStorage.getItem('studysync_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Helper to save user info to localStorage
 */
export function setSavedUser(user) {
  if (user) {
    localStorage.setItem('studysync_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('studysync_user');
  }
}

/**
 * Builds a query string from an object, skipping undefined/null/empty values
 */
function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

/**
 * Core HTTP request method
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    params,
    body,
    headers = {},
    isFormData = false,
    ...customConfig
  } = options;

  const queryString = params ? buildQueryString(params) : '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}${queryString}`;

  const requestHeaders = { ...headers };

  // Set Authorization header if token exists
  const token = getAuthToken();
  if (token && !requestHeaders['Authorization']) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Handle JSON content-type
  let requestBody = body;
  if (body && !isFormData && typeof body === 'object') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const config = {
    method,
    headers: requestHeaders,
    body: requestBody,
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);
    let data = null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      // Backend error format: { success: false, message: "...", details?: [...] }
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      const error = new ApiError(errorMessage, response.status, data?.details, data);

      // Handle 401 Unauthorized token expiry or invalidation
      if (response.status === 401 && token) {
        window.dispatchEvent(new CustomEvent('studysync:unauthorized', { detail: { endpoint } }));
      }

      throw error;
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors or fetch failures
    throw new ApiError(err.message || 'Network error connecting to StudySync server', 0, null, err);
  }
}

// Convenience methods
export const api = {
  get: (endpoint, params, options) => request(endpoint, { method: 'GET', params, ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
  upload: (endpoint, formData, options) =>
    request(endpoint, {
      method: 'POST',
      body: formData,
      isFormData: true,
      ...options,
    }),
};

export default api;
