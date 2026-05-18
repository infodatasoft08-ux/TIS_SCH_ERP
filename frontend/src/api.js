import axios from 'axios';
export const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5003/api';
const API = axios.create({
  baseURL: BASE_URL
});

// set auth header if token exists
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;