import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import axios from 'axios';
import { API_URL } from '../config/api';
import MockAPIService from '../services/MockAPIService';

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === 'true';

interface User {
  user_id: string;
  username: string;
  pin_hash: string;
  biometric_enabled: boolean;
  balance?: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  register: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hashPin: (pin: string) => Promise<string>;
  setUser: (user: User | null, pinHash?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  hashPin: async (pin: string) => {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    return hash;
  },

  setUser: async (user: User | null, pinHash?: string) => {
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      if (pinHash) {
        await AsyncStorage.setItem('pin_hash', pinHash);
      }
      set({ user });
      return;
    }

    await AsyncStorage.multiRemove(['user', 'pin_hash']);
    set({ user: null, token: null });
  },

  register: async (username: string, pin: string) => {
    set({ isLoading: true });
    try {
      const pinHash = await get().hashPin(pin);

      let user;
      if (DEV_BYPASS) {
        console.log('[DEV BYPASS] Registering user with mock API');
        user = await MockAPIService.registerUser({ username, pin_hash: pinHash });
      } else {
        const response = await axios.post(`${API_URL}/api/users/register`, {
          username,
          pin_hash: pinHash,
        });
        user = response.data;
      }

      await get().setUser(user, pinHash);
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  login: async (username: string, pin: string) => {
    set({ isLoading: true });
    try {
      const pinHash = await get().hashPin(pin);

      let user;
      if (DEV_BYPASS) {
        console.log('[DEV BYPASS] Logging in user with mock API');
        user = await MockAPIService.loginUser({ username, pin_hash: pinHash });
      } else {
        const response = await axios.post(`${API_URL}/api/users/login`, {
          username,
          pin_hash: pinHash,
        });
        user = response.data;
      }

      await get().setUser(user, pinHash);
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  logout: async () => {
    await get().setUser(null);
  },

  checkAuth: async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        set({ user });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  },

  refreshUser: async () => {
    const { user } = get();
    if (!user) {
      console.log('[AuthStore] No user to refresh');
      return;
    }

    try {
      console.log('[AuthStore] Refreshing user:', user.user_id);
      let updatedUser;
      if (DEV_BYPASS) {
        console.log('[DEV BYPASS] Refreshing user with mock API');
        updatedUser = await MockAPIService.getUser(user.user_id);
        console.log('[DEV BYPASS] Updated user:', updatedUser);
      } else {
        console.log('[AuthStore] Fetching from API:', `${API_URL}/api/users/${user.user_id}`);
        const response = await axios.get(`${API_URL}/api/users/${user.user_id}`);
        updatedUser = response.data;
        console.log('[AuthStore] API response:', updatedUser);
      }

      await get().setUser(updatedUser);
      console.log('[AuthStore] User refreshed, new balance:', updatedUser.balance);
    } catch (error: any) {
      console.error('[AuthStore] Failed to refresh user:', error);
      console.error('[AuthStore] Error message:', error.message);
    }
  },
}));
