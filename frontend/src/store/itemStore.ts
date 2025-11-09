import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config/api';
import MockAPIService from '../services/MockAPIService';

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === 'true';

interface Item {
  item_id: string;
  owner_id: string;
  category: string;
  subcategory: string;
  brand: string;
  condition: string;
  photo: string;
  value: number;
  is_fractional: boolean;
  share_percentage: number;
  parent_item_id?: string;
  created_at: string;
  updated_at: string;
}

interface ItemState {
  items: Item[];
  isLoading: boolean;
  fetchItems: (userId: string) => Promise<void>;
  addItem: (item: Omit<Item, 'item_id' | 'created_at' | 'updated_at'>) => Promise<Item>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  getValuation: (data: any) => Promise<any>;
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchItems: async (userId: string) => {
    set({ isLoading: true });
    try {
      if (DEV_BYPASS) {
        const items = await MockAPIService.fetchItems(userId);
        set({ items, isLoading: false });
      } else {
        const response = await axios.get(`${API_URL}/api/items/user/${userId}`);
        set({ items: response.data, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      set({ isLoading: false });
    }
  },

  addItem: async (itemData) => {
    set({ isLoading: true });
    try {
      let newItem;
      if (DEV_BYPASS) {
        newItem = await MockAPIService.addItem(itemData);
      } else {
        const response = await axios.post(`${API_URL}/api/items`, itemData);
        newItem = response.data;
      }
      set((state) => ({
        items: [...state.items, newItem],
        isLoading: false
      }));
      return newItem;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateItem: async (itemId: string, updates: Partial<Item>) => {
    try {
      if (DEV_BYPASS) {
        await MockAPIService.updateItem(itemId, updates);
      } else {
        await axios.put(`${API_URL}/api/items/${itemId}`, updates);
      }
      set((state) => ({
        items: state.items.map((item) =>
          item.item_id === itemId ? { ...item, ...updates } : item
        ),
      }));
    } catch (error) {
      throw error;
    }
  },

  deleteItem: async (itemId: string) => {
    try {
      if (DEV_BYPASS) {
        await MockAPIService.deleteItem(itemId);
      } else {
        await axios.delete(`${API_URL}/api/items/${itemId}`);
      }
      set((state) => ({
        items: state.items.filter((item) => item.item_id !== itemId),
      }));
    } catch (error) {
      throw error;
    }
  },

  getValuation: async (data: any) => {
    try {
      if (DEV_BYPASS) {
        return await MockAPIService.getValuation(data);
      } else {
        const response = await axios.post(`${API_URL}/api/valuations/mock`, data);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },
}));
