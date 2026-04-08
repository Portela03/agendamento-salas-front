import axios from 'axios';

const TOKEN_KEY = '@agendamento:token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Axios instance with base URL and automatic JWT injection.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api, TOKEN_KEY };
