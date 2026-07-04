import axios from 'axios';

// In production the API is served from the same origin (Vercel serverless
// function under /api), so an empty base URL is correct. VITE_API_BASE only
// needs to be set for local dev or a split-host deployment.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000'),
  withCredentials: true
});

export default api;
