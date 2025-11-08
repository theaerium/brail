import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import axios from 'axios';
import React from 'react';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  username: string;
  pin_hash: string;
  biometric_enabled: boolean;
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

  register: async (username: string, pin: string) => {
    set({ isLoading: true });
    try {
      const pinHash = await get().hashPin(pin);
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username,
        pin_hash: pinHash,
      });

      const user = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('pin_hash', pinHash);
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  login: async (username: string, pin: string) => {
    set({ isLoading: true });
    try {
      const pinHash = await get().hashPin(pin);
      const response = await axios.post(`${API_URL}/api/users/login`, {
        username,
        pin_hash: pinHash,
      });

      const user = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('pin_hash', pinHash);
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('pin_hash');
    set({ user: null, token: null });
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
}));
