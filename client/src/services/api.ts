import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session;
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export type ApiResponse<T> = { data: T; meta?: { page: number; limit: number; total: number } };
