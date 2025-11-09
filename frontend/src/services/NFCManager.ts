// Conditional NFC implementation that works in both Expo Go and development builds
let NfcManagerModule: any = null;
let NfcTechModule: any = null;
let NdefModule: any = null;
let isNFCAvailable = false;

try {
  // Try to import the native module
  const nfcModule = require('react-native-nfc-manager');
  NfcManagerModule = nfcModule.default;
  NfcTechModule = nfcModule.NfcTech;
  NdefModule = nfcModule.Ndef;
  isNFCAvailable = true;
} catch (error) {
  // NFC module not available (Expo Go)
  console.log('NFC module not available - using mock implementation');
}

// Mock NfcTech enum
const MockNfcTech = {
  Ndef: 'Ndef',
  NfcA: 'NfcA',
  NfcB: 'NfcB',
  NfcF: 'NfcF',
  NfcV: 'NfcV',
  IsoDep: 'IsoDep',
  MifareClassic: 'MifareClassic',
  MifareUltralight: 'MifareUltralight',
  MifareIOS: 'MifareIOS',
};

// Mock Ndef utilities
const MockNdef = {
  textRecord: (text: string) => ({
    tnf: 1,
    type: [84],
    id: [],
    payload: new TextEncoder().encode(text),
  }),
  encodeMessage: (records: any[]) => {
    console.warn('NFC not available in Expo Go - using mock');
    return new Uint8Array(0);
  },
  text: {
    decodePayload: (payload: Uint8Array) => {
      return new TextDecoder().decode(payload);
    },
  },
};

// Mock NfcManager
const MockNfcManager = {
  isSupported: async () => {
    console.warn('NFC not available in Expo Go');
    return false;
  },
  start: async () => {
    console.warn('NFC not available in Expo Go');
  },
  requestTechnology: async (tech: string) => {
    throw new Error('NFC not available in Expo Go. Please use a development build.');
  },
  getTag: async () => {
    throw new Error('NFC not available in Expo Go. Please use a development build.');
  },
  cancelTechnologyRequest: async () => {
    console.warn('NFC not available in Expo Go');
  },
  unregisterTagEvent: async () => {
    console.warn('NFC not available in Expo Go');
  },
  ndefHandler: {
    writeNdefMessage: async (bytes: any) => {
      throw new Error('NFC not available in Expo Go. Please use a development build.');
    },
  },
};

// Export the real or mock modules
export const NfcManager = NfcManagerModule || MockNfcManager;
export const NfcTech = NfcTechModule || MockNfcTech;
export const Ndef = NdefModule || MockNdef;
export { isNFCAvailable };
