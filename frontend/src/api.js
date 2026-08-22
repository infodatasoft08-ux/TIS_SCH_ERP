import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5003/api';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000 // 15s timeout to prevent hanging requests on network/server stalls
});

// Set auth header if token exists
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Global response interceptor for handling server timeouts & authorization errors
API.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('⚠️ Server request timed out');
      error.customMessage = 'Server request timed out. Please check your internet connection or try again.';
    } else if (error.response?.status === 401) {
      // Clear invalid credentials on auth failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if ([502, 503, 504].includes(error.response?.status)) {
      error.customMessage = 'Server gateway is temporarily busy. Please retry in a few moments.';
    }
    return Promise.reject(error);
  }
);

export default API;