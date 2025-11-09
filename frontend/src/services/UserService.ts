import axios from 'axios';
import { API_URL } from '../config/api';
import MockAPIService from './MockAPIService';

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS === 'true';

export interface UserProfile {
  user_id: string;
  username: string;
  pin_hash?: string;
  biometric_enabled?: boolean;
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

export const UserService = {
  async findByUsername(username: string): Promise<UserProfile> {
    if (!username) {
      throw new Error('Username is required');
    }

    if (DEV_BYPASS) {
      return MockAPIService.findUserByUsername(username);
    }

    const response = await axios.get(
      `${API_URL}/api/users/by-username/${encodeURIComponent(username)}`
    );
    return response.data;
  },
};

export default UserService;
