import axios from 'axios';
const API = axios.create({
  baseURL: import.meta.env.HOSTING_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE
});

// set auth header if token exists
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;