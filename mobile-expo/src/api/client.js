import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Override via EXPO_PUBLIC_API_BASE in .env when testing on a physical device,
// e.g. EXPO_PUBLIC_API_BASE=http://192.168.1.10:8000
const DEFAULT_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || DEFAULT_BASE;

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (cfg) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
      if (onUnauthorized) {
        onUnauthorized();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
