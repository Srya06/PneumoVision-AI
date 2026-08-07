import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pv_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // On 401 — clear token and force logout
    if (err.response?.status === 401) {
      localStorage.removeItem('pv_access_token');
      localStorage.removeItem('pv_user');
      window.dispatchEvent(new Event('storage'));
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

