import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
      const response = await axios.get(`${API_URL}/api/items/user/${userId}`);
      set({ items: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch items:', error);
      set({ isLoading: false });
    }
  },

  addItem: async (itemData) => {
    set({ isLoading: true });
    try {
      const response = await axios.post(`${API_URL}/api/items`, itemData);
      const newItem = response.data;
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
      await axios.put(`${API_URL}/api/items/${itemId}`, updates);
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
      await axios.delete(`${API_URL}/api/items/${itemId}`);
      set((state) => ({
        items: state.items.filter((item) => item.item_id !== itemId),
      }));
    } catch (error) {
      throw error;
    }
  },

  getValuation: async (data: any) => {
    try {
      const response = await axios.post(`${API_URL}/api/valuations/mock`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
}));
