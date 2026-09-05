import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5003/api';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 60000 // 60s timeout to allow longer server rendering operations
});

// Set auth header if token exists
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Global response interceptor for handling refreshed tokens, server timeouts & authorization errors
// API.interceptors.response.use(
//   response => {
//     // Rolling token refresh handler
//     const refreshedToken = response.headers?.['x-refreshed-token'];
//     if (refreshedToken) {
//       localStorage.setItem('token', refreshedToken);
//       API.defaults.headers.common.Authorization = `Bearer ${refreshedToken}`;
//     }
//     return response;
//   },
//   error => {
//     if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
//       console.warn('⚠️ Server request timed out');
//       error.customMessage = 'Server request timed out. Please check your internet connection or try again.';
//     } else if (error.response?.status === 401) {
//       // Clear invalid credentials on auth failure
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       if (window.location.pathname !== '/login') {
//         window.location.href = '/login';
//       }
//     } else if ([502, 503, 504].includes(error.response?.status)) {
//       error.customMessage = 'Server gateway is temporarily busy. Please retry in a few moments.';
//     }
//     return Promise.reject(error);
//   }
// );


// Safe Refreshed Token Handler (Verifies User ID before saving)
function handleRefreshedToken(refreshedToken) {
  if (!refreshedToken) return;
  try {
    const activeUserRaw = localStorage.getItem('user');
    if (!activeUserRaw) return;
    const activeUser = JSON.parse(activeUserRaw);
    if (!activeUser?.id) return;
    // Decode JWT payload
    const base64Url = refreshedToken.split('.')[1];
    if (!base64Url) return;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const refreshedPayload = JSON.parse(jsonPayload);
    // STRICT GUARD: Only accept refreshed token if it belongs to the active logged-in user!
    if (String(refreshedPayload.id) === String(activeUser.id)) {
      localStorage.setItem('token', refreshedToken);
      API.defaults.headers.common.Authorization = `Bearer ${refreshedToken}`;
      window.dispatchEvent(new CustomEvent('auth:token_refreshed', { detail: refreshedToken }));
    } else {
      console.warn(`[Auth API] Discarded refreshed token for user_id=${refreshedPayload.id} (Active user is user_id=${activeUser.id})`);
    }
  } catch (err) {
    console.error('[Auth API] Error validating refreshed token:', err);
  }
}
// Global response interceptor
API.interceptors.response.use(
  response => {
    // Handle rolling token safely
    const refreshedToken = response.headers?.['x-refreshed-token'];
    handleRefreshedToken(refreshedToken);
    return response;
  },
  error => {
    // Handle rolling token even on error responses
    const refreshedToken = error.response?.headers?.['x-refreshed-token'];
    handleRefreshedToken(refreshedToken);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('⚠️ Server request timed out');
      error.customMessage = 'Server request timed out. Please check your internet connection or try again.';
    } else if (error.response?.status === 401) {
      // Clear invalid credentials on auth failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logged_out'));
      const currentPath = window.location.pathname;
      if (!PUBLIC_PATHS.includes(currentPath)) {
        window.location.href = '/login';
      }
    } else if ([502, 503, 504].includes(error.response?.status)) {
      error.customMessage = 'Server gateway is temporarily busy. Please retry in a few moments.';
    }
    return Promise.reject(error);
  }
);

export default API;