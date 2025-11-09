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
      await this.init();
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Compress data for small tags
      const compactData = this.compressItemData(data);
      const jsonString = JSON.stringify(compactData);

      // Create NDEF record
      const bytes = Ndef.encodeMessage([Ndef.textRecord(jsonString)]);

      // Write to tag
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      
      console.log('Item tag written successfully');
    } catch (error) {
      console.error('Failed to write NFC tag:', error);
      throw error;
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }

  async readItemTag(): Promise<ItemNFCData> {
    if (!this.isAvailable) {
      throw new Error('NFC is not available in Expo Go. Please use a custom development build or test other features without NFC.');
    }

    try {
      await this.init();
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const tag = await NfcManager.getTag();
      
      if (!tag || !tag.ndefMessage) {
        throw new Error('No data on tag');
      }

      const ndefRecords = tag.ndefMessage;
      const textRecord = ndefRecords[0];
      
      if (textRecord && textRecord.payload) {
        const payloadData = Ndef.text.decodePayload(new Uint8Array(textRecord.payload));
        const compactData = JSON.parse(payloadData);
        return this.expandItemData(compactData);
      }

      throw new Error('Invalid tag format');
    } catch (error) {
      console.error('Failed to read NFC tag:', error);
      throw error;
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }

  private compressItemData(data: ItemNFCData): CompactNFCData {
    return {
      id: this.shortenUUID(data.item_id),
      own: this.shortenUUID(data.owner_id),
      cat: data.category.substring(0, 10),
      sub: data.subcategory.substring(0, 15),
      brd: data.brand?.substring(0, 10),
      val: Math.round(data.value * 100) / 100,
      frac: data.is_fractional ? 1 : 0,
      pct: data.share_percentage
        ? Math.round(data.share_percentage * 1000) / 1000
        : undefined,
      par: data.parent_item_id ? this.shortenUUID(data.parent_item_id) : undefined,
      ts: data.timestamp,
      sig: data.signature.substring(0, 16),
    };
  }

  private expandItemData(compact: CompactNFCData): ItemNFCData {
    return {
      item_id: compact.id, // In production, expand to full UUID
      owner_id: compact.own,
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

  private shortenUUID(uuid: string): string {
    return uuid.replace(/-/g, '').substring(0, 12);
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
