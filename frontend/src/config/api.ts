import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API Configuration
 *
 * This handles backend URL configuration for different environments:
 * - Development builds on simulator: Uses localhost via LAN IP
 * - Development builds on physical device: Uses ngrok tunnel
 * - Production builds: Uses production API URL
 */

// Get the ngrok URL from environment variables
const NGROK_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Get your local machine's LAN IP (Metro bundler shows this)
// This is automatically set by Expo when running the dev server
const DEV_LAN_URL = Constants.expoConfig?.hostUri
  ? `http://${Constants.expoConfig.hostUri.split(':')[0]}:8002`
  : 'http://10.100.82.15:8002';

/**
 * Determine which API URL to use
 *
 * Priority:
 * 1. If EXPO_PUBLIC_BACKEND_URL is set and starts with https (ngrok), use it
 * 2. If running in __DEV__ mode, use LAN URL for simulator
 * 3. Otherwise use the environment variable or fallback
 */
export const getApiUrl = (): string => {
  // Always use ngrok if it's configured (works everywhere)
  if (NGROK_URL.startsWith('https://')) {
    console.log('[API Config] Using ngrok URL:', NGROK_URL);
    return NGROK_URL;
  }

  // In development, use LAN IP for simulator
  if (__DEV__) {
    console.log('[API Config] Using LAN URL:', DEV_LAN_URL);
    return DEV_LAN_URL;
  }

  // Production fallback
  console.log('[API Config] Using production URL');
  return NGROK_URL || 'https://api.yourdomain.com';
};

export const API_URL = getApiUrl();

// Log the configuration on app start
console.log('=== API Configuration ===');
console.log('Environment:', __DEV__ ? 'Development' : 'Production');
console.log('Platform:', Platform.OS);
console.log('API URL:', API_URL);
console.log('========================');
