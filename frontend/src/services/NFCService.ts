import { NfcManager, NfcTech, Ndef, isNFCAvailable } from './NFCManager';
import * as Crypto from 'expo-crypto';

// Conditionally import NFC manager only if available
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;

try {
  // Try to import NFC manager (only works in custom dev builds, not Expo Go)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default;
  NfcTech = nfcModule.NfcTech;
  Ndef = nfcModule.Ndef;
} catch {
  // NFC module not available (Expo Go or unsupported platform)
  console.log('NFC module not available - running in Expo Go or unsupported platform');
}

export interface ItemNFCData {
  item_id: string;
  owner_id: string;
  category: string;
  subcategory: string;
  brand?: string;
  value: number;
  is_fractional: boolean;
  share_percentage?: number;
  parent_item_id?: string;
  timestamp: number;
  signature: string;
}

export interface CompactNFCData {
  id: string;
  own: string;
  cat: string;
  sub: string;
  brd?: string;
  val: number;
  frac: number;
  pct?: number;
  par?: string;
  ts: number;
  sig: string;
}

class NFCService {
  private initialized = false;
  private isAvailable = false;

  constructor() {
    // Check if NFC module is available
    this.isAvailable = NfcManager !== null;
  }

  async init() {
    if (!this.isAvailable) {
      console.log('NFC not available - requires custom development build');
      return false;
    }

    if (this.initialized) return true;

    if (!isNFCAvailable) {
      console.warn('NFC not available - running in Expo Go or web. Use a development build for NFC functionality.');
      return false;
    }

    try {
      const supported = await NfcManager.isSupported();
      if (supported) {
        await NfcManager.start();
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('NFC init failed:', error);
      return false;
    }
  }

  async writeItemTag(data: ItemNFCData): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('NFC is not available in Expo Go. Please use a custom development build or test other features without NFC.');
    }

    try {
      console.log('[NFCService] Starting writeItemTag...');
      console.log('[NFCService] Input data:', JSON.stringify(data, null, 2));

      console.log('[NFCService] Initializing NFC...');
      await this.init();

      console.log('[NFCService] Requesting NDEF technology...');
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Compress data for small tags
      console.log('[NFCService] Compressing data...');
      const compactData = this.compressItemData(data);
      console.log('[NFCService] Compact data:', JSON.stringify(compactData, null, 2));

      const jsonString = JSON.stringify(compactData);
      console.log('[NFCService] JSON string length:', jsonString.length, 'bytes');
      console.log('[NFCService] JSON string:', jsonString);

      // Create NDEF record
      console.log('[NFCService] Encoding NDEF message...');
      const bytes = Ndef.encodeMessage([Ndef.textRecord(jsonString)]);
      console.log('[NFCService] Encoded bytes length:', bytes?.length);

      // Write to tag
      console.log('[NFCService] Writing to NFC tag...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      console.log('[NFCService] Item tag written successfully!');
    } catch (error: any) {
      console.error('[NFCService] Failed to write NFC tag:', error);
      console.error('[NFCService] Error type:', typeof error);
      console.error('[NFCService] Error name:', error?.name);
      console.error('[NFCService] Error message:', error?.message);
      console.error('[NFCService] Error constructor:', error?.constructor?.name);

      // Create a more user-friendly error message
      let userMessage = 'Failed to write to NFC tag.';

      if (error?.constructor?.name === 'TagUpdateFailure' || error?.name === 'TagUpdateFailure') {
        userMessage = 'Tag write failed. This usually means:\n\n' +
          '• Tag is write-protected or locked\n' +
          '• Tag moved away during write\n' +
          '• Tag is not NTAG215 compatible\n' +
          '• Tag is already programmed and locked\n\n' +
          'Try a new, blank NTAG215 tag.';
      } else if (error?.name === 'UserCancel') {
        userMessage = 'NFC write was cancelled.';
      } else if (error?.name === 'Timeout') {
        userMessage = 'NFC write timed out. Hold phone steady near tag for longer.';
      }

      const enhancedError = new Error(userMessage);
      enhancedError.name = error?.constructor?.name || error?.name || 'NFCError';
      throw enhancedError;
    } finally {
      console.log('[NFCService] Canceling technology request...');
      try {
        await NfcManager.cancelTechnologyRequest();
        console.log('[NFCService] Technology request canceled');
      } catch (cancelError) {
        console.error('[NFCService] Error canceling technology:', cancelError);
      }
    }
  }

  async readItemTag(): Promise<ItemNFCData> {
    if (!this.isAvailable) {
      throw new Error('NFC is not available in Expo Go. Please use a custom development build or test other features without NFC.');
    }

    try {
      console.log('[NFCService] Starting readItemTag...');

      console.log('[NFCService] Initializing NFC...');
      await this.init();

      console.log('[NFCService] Requesting NDEF technology...');
      await NfcManager.requestTechnology(NfcTech.Ndef);

      console.log('[NFCService] Getting tag...');
      const tag = await NfcManager.getTag();

      console.log('[NFCService] Tag received:', tag ? 'YES' : 'NO');
      console.log('[NFCService] Tag object:', JSON.stringify(tag, null, 2));

      if (!tag) {
        console.error('[NFCService] Tag is null/undefined');
        throw new Error('No tag detected');
      }

      console.log('[NFCService] Tag ndefMessage:', tag.ndefMessage ? 'EXISTS' : 'NULL');
      console.log('[NFCService] ndefMessage content:', tag.ndefMessage);

      if (!tag.ndefMessage) {
        console.error('[NFCService] Tag has no NDEF message');
        console.error('[NFCService] Tag may be blank, locked, or corrupted');
        throw new Error('No data on tag');
      }

      const ndefRecords = tag.ndefMessage;
      console.log('[NFCService] NDEF records count:', ndefRecords.length);

      const textRecord = ndefRecords[0];
      console.log('[NFCService] First record:', textRecord);

      if (textRecord && textRecord.payload) {
        console.log('[NFCService] Payload length:', textRecord.payload.length);
        const payloadData = Ndef.text.decodePayload(new Uint8Array(textRecord.payload));
        console.log('[NFCService] Decoded payload:', payloadData);

        const compactData = JSON.parse(payloadData);
        console.log('[NFCService] Parsed data:', compactData);

        const expandedData = this.expandItemData(compactData);
        console.log('[NFCService] Read successful!');
        return expandedData;
      }

      console.error('[NFCService] No payload in text record');
      throw new Error('Invalid tag format');
    } catch (error: any) {
      console.error('[NFCService] Failed to read NFC tag:', error);
      console.error('[NFCService] Error message:', error.message);
      console.error('[NFCService] Error type:', error.constructor?.name);
      throw error;
    } finally {
      console.log('[NFCService] Canceling technology request...');
      await NfcManager.cancelTechnologyRequest();
    }
  }

  private compressItemData(data: ItemNFCData): CompactNFCData {
    return {
      id: data.item_id, // Store full UUID
      own: data.owner_id, // Store full UUID
      cat: data.category.substring(0, 10),
      sub: data.subcategory.substring(0, 15),
      brd: data.brand?.substring(0, 10),
      val: Math.round(data.value * 100) / 100,
      frac: data.is_fractional ? 1 : 0,
      pct: data.share_percentage
        ? Math.round(data.share_percentage * 1000) / 1000
        : undefined,
      par: data.parent_item_id || undefined,
      ts: data.timestamp,
      sig: data.signature.substring(0, 16),
    };
  }

  private expandItemData(compact: CompactNFCData): ItemNFCData {
    return {
      item_id: compact.id, // Full UUID
      owner_id: compact.own, // Full UUID
      category: compact.cat,
      subcategory: compact.sub,
      brand: compact.brd,
      value: compact.val,
      is_fractional: compact.frac === 1,
      share_percentage: compact.pct,
      parent_item_id: compact.par,
      timestamp: compact.ts,
      signature: compact.sig,
    };
  }

  async generateSignature(data: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return hash;
  }

  async cancelNFC() {
    if (!this.isAvailable || !NfcManager) {
      return;
    }
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Cancel NFC failed:', error);
    }
  }

  cleanup() {
    if (!this.isAvailable || !NfcManager) {
      return;
    }
    if (this.initialized) {
      NfcManager.unregisterTagEvent().catch(() => {});
      this.initialized = false;
    }
  }

  // Helper method to check if NFC is available
  isNFCAvailable(): boolean {
    return this.isAvailable;
  }
}

export default new NFCService();
