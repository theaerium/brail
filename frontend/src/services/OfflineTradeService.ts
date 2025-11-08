import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STORAGE_KEY = '@offline_trades';

export interface TradeItem {
  item_id: string;
  item_name: string;
  share_percentage: number;
  value: number;
  previous_owner: string;
  new_owner: string;
}

export interface OfflineTrade {
  trade_id: string;
  timestamp: number;
  payer_id: string;
  payer_name: string;
  payee_id: string;
  payee_name: string;
  items: TradeItem[];
  total_value: number;
  status: 'pending' | 'synced' | 'failed';
  payer_signature: string;
  payee_signature: string;
}

export class OfflineTradeService {
  static async recordTrade(
    payerId: string,
    payerName: string,
    payeeId: string,
    payeeName: string,
    items: TradeItem[],
    payerSignature: string,
    payeeSignature: string
  ): Promise<OfflineTrade> {
    const trade: OfflineTrade = {
      trade_id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      payer_id: payerId,
      payer_name: payerName,
      payee_id: payeeId,
      payee_name: payeeName,
      items: items,
      total_value: items.reduce((sum, item) => sum + item.value, 0),
      status: 'pending',
      payer_signature: payerSignature,
      payee_signature: payeeSignature,
    };

    await this.saveTrade(trade);
    return trade;
  }

  static async saveTrade(trade: OfflineTrade): Promise<void> {
    const trades = await this.getPendingTrades();
    trades.push(trade);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }

  static async getPendingTrades(): Promise<OfflineTrade[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Error getting pending trades:', error);
      return [];
    }
  }

  static async syncPendingTrades(): Promise<{ synced: number; failed: number }> {
    const trades = await this.getPendingTrades();
    let synced = 0;
    let failed = 0;

    for (const trade of trades) {
      if (trade.status === 'synced') continue;

      try {
        await axios.post(`${API_URL}/api/trades`, {
          payer_id: trade.payer_id,
          payee_id: trade.payee_id,
          items: trade.items,
          total_value: trade.total_value,
          payer_signature: trade.payer_signature,
          payee_signature: trade.payee_signature,
        });

        trade.status = 'synced';
        synced++;
      } catch (error) {
        console.error('Failed to sync trade:', trade.trade_id, error);
        trade.status = 'failed';
        failed++;
      }
    }

    const remainingTrades = trades.filter((t) => t.status !== 'synced');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remainingTrades));

    return { synced, failed };
  }

  static async generateSignature(data: any, pin: string): Promise<string> {
    const dataString = JSON.stringify(data);
    const combined = `${dataString}:${pin}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    return hash;
  }

  static async clearAllTrades(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
