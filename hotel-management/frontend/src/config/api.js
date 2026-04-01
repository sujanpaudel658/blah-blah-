import axios from 'axios';

/**
 * If REACT_APP_BACKEND_URL is set → full URL (e.g. production or special setups).
 * Otherwise → "/api" so the browser uses whatever host opened the app (localhost, LAN IP, etc.).
 * Dev server / Docker must proxy /api (and /uploads) to the backend.
 */
const explicit = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
export const API_URL = explicit ? `${explicit}/api` : '/api';

/** Empty when using same-origin proxy; used for image paths like /uploads/... */
export const BACKEND_ORIGIN = explicit;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
