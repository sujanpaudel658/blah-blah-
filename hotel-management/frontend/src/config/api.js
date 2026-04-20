import axios from 'axios';

// API base: REACT_APP_BACKEND_URL + /api, or same-origin "/api" (dev proxy).
const explicit = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
export const API_URL = explicit ? `${explicit}/api` : '/api';

// Absolute backend origin for static files; blank when using "/api" proxy.
export const BACKEND_ORIGIN = explicit;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?needsVerification=1';
    }
    return Promise.reject(error);
  }
);

export default api;
