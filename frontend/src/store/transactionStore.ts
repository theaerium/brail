import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config/api';
import MockAPIService from '../services/MockAPIService';

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === 'true';

export interface SpentItem {
  item_id: string;
  label?: string;
  amount: number;
  fraction: number;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  type: 'deposit' | 'payment' | 'withdrawal' | 'refund' | 'transfer';
  amount: number;
  item_id?: string;
  item_details?: {
    brand?: string;
    subcategory?: string;
    category?: string;
    condition?: string;
  };
  merchant_name?: string;
  website_name?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  spent_items?: SpentItem[];
  created_at: string;
  updated_at?: string;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: (userId: string) => Promise<void>;
  createTransaction: (
    transactionData: Omit<Transaction, 'transaction_id' | 'created_at'>,
    options?: { silent?: boolean }
  ) => Promise<Transaction>;
  addLocalTransaction: (transaction: Transaction) => void;
  getTransactionById: (transactionId: string) => Transaction | undefined;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async (userId: string) => {
    set({ isLoading: true });
    try {
      if (DEV_BYPASS) {
        console.log('[DEV BYPASS] Fetching transactions with mock API');
        const transactions = await MockAPIService.fetchTransactions(userId);
        set({ transactions, isLoading: false });
      } else {
        const response = await axios.get(`${API_URL}/api/transactions/user/${userId}`);
        set({ transactions: response.data, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ isLoading: false });
    }
  },

  createTransaction: async (transactionData, options = {}) => {
    set({ isLoading: true });
    try {
      let newTransaction;
      if (DEV_BYPASS) {
        console.log('[DEV BYPASS] Creating transaction with mock API');
        newTransaction = await MockAPIService.createTransaction(transactionData);
      } else {
        const response = await axios.post(`${API_URL}/api/transactions`, transactionData);
        newTransaction = response.data;
      }

      if (options.silent) {
        set({ isLoading: false });
      } else {
        set((state) => ({
          transactions: [newTransaction, ...state.transactions.filter((tx) => tx.transaction_id !== newTransaction.transaction_id)],
          isLoading: false
        }));
      }
      return newTransaction;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addLocalTransaction: (transaction) => {
    set((state) => {
      if (state.transactions.some((tx) => tx.transaction_id === transaction.transaction_id)) {
        return state;
      }
      return {
        transactions: [transaction, ...state.transactions]
      };
    });
  },

  getTransactionById: (transactionId: string) => {
    return get().transactions.find(tx => tx.transaction_id === transactionId);
  },
}));
