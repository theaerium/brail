/**
 * Mock API Service for Development/Testing
 *
 * This service provides mock responses for all API endpoints
 * to enable NFC testing without a backend connection.
 *
 * Enable by setting EXPO_PUBLIC_DEV_BYPASS="true" in .env
 */

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

interface MockUser {
  user_id: string;
  username: string;
  pin_hash: string;
  biometric_enabled: boolean;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

class MockAPIService {
  private mockItems: Item[] = [];
  private mockUserId = 'mock-user-123';
  private mockUsers: Record<string, MockUser> = {};

  constructor() {
    const defaultUser: MockUser = {
      user_id: this.mockUserId,
      username: 'mockuser',
      pin_hash: 'mock-pin-hash',
      biometric_enabled: false,
      email: 'mock@example.com',
    };
    this.mockUsers[defaultUser.username.toLowerCase()] = defaultUser;
  }

  private delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureMockUser(username: string, overrides: Partial<MockUser> = {}): MockUser {
    const key = (username || 'mockuser').toLowerCase();
    const existing = this.mockUsers[key];

    if (existing) {
      const updated = { ...existing, ...overrides, username: overrides.username || existing.username };
      this.mockUsers[key] = updated;
      return updated;
    }

    const newUser: MockUser = {
      user_id: overrides.user_id || this.generateId(),
      username: username || overrides.username || 'mockuser',
      pin_hash: overrides.pin_hash || 'mock-pin-hash',
      biometric_enabled: overrides.biometric_enabled ?? false,
      email: overrides.email ?? `${username || 'mockuser'}@mockmail.com`,
      first_name: overrides.first_name ?? null,
      last_name: overrides.last_name ?? null,
      phone: overrides.phone ?? null,
      street_address: overrides.street_address ?? null,
      city: overrides.city ?? null,
      state: overrides.state ?? null,
      zip_code: overrides.zip_code ?? null,
      country: overrides.country ?? null,
    };

    this.mockUsers[key] = newUser;
    return newUser;
  }

  async fetchItems(userId: string): Promise<Item[]> {
    console.log('[MOCK API] Fetching items for user:', userId);
    await this.delay();
    return this.mockItems.filter(item => item.owner_id === userId);
  }

  async addItem(itemData: Omit<Item, 'item_id' | 'created_at' | 'updated_at'>): Promise<Item> {
    console.log('[MOCK API] Adding item:', itemData);
    await this.delay();

    const newItem: Item = {
      ...itemData,
      item_id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockItems.push(newItem);
    return newItem;
  }

  async updateItem(itemId: string, updates: Partial<Item>): Promise<void> {
    console.log('[MOCK API] Updating item:', itemId, updates);
    await this.delay();

    const index = this.mockItems.findIndex(item => item.item_id === itemId);
    if (index !== -1) {
      this.mockItems[index] = {
        ...this.mockItems[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    console.log('[MOCK API] Deleting item:', itemId);
    await this.delay();

    this.mockItems = this.mockItems.filter(item => item.item_id !== itemId);
  }

  async getValuation(data: any): Promise<any> {
    console.log('[MOCK API] Getting valuation for:', data);
    await this.delay();

    // Generate mock valuation based on category
    const baseValue = data.category === 'Electronics' ? 500 :
                     data.category === 'Jewelry' ? 1000 :
                     data.category === 'Collectibles' ? 300 :
                     250;

    const randomVariation = Math.random() * 200 - 100;

    return {
      estimated_value: Math.max(50, baseValue + randomVariation),
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
      market_data: {
        recent_sales: Math.floor(Math.random() * 100) + 10,
        average_price: baseValue,
        price_trend: Math.random() > 0.5 ? 'increasing' : 'stable',
      },
      sources: ['Mock Data'],
    };
  }

  async registerUser(userData: any): Promise<any> {
    console.log('[MOCK API] Registering user:', userData);
    await this.delay();

    return this.ensureMockUser(userData.username, {
      pin_hash: userData.pin_hash || 'mock-pin-hash',
      email: userData.email || 'mock@example.com',
      first_name: userData.first_name || null,
      last_name: userData.last_name || null,
      phone: userData.phone || null,
      street_address: userData.street_address || null,
      city: userData.city || null,
      state: userData.state || null,
      zip_code: userData.zip_code || null,
      country: userData.country || null,
    });
  }

  async loginUser(credentials: any): Promise<any> {
    console.log('[MOCK API] Logging in user:', credentials);
    await this.delay();

    return this.ensureMockUser(credentials.username, {
      pin_hash: credentials.pin_hash || 'mock-pin-hash',
    });
  }

  async findUserByUsername(username: string): Promise<MockUser> {
    console.log('[MOCK API] Looking up user by username:', username);
    await this.delay();
    return this.ensureMockUser(username);
  }

  async createTransaction(transactionData: any): Promise<any> {
    console.log('[MOCK API] Creating transaction:', transactionData);
    await this.delay();

    return {
      transaction_id: this.generateId(),
      ...transactionData,
      status: transactionData.status || 'completed',
      created_at: new Date().toISOString(),
    };
  }

  async fetchTransactions(userId: string): Promise<any[]> {
    console.log('[MOCK API] Fetching transactions for user:', userId);
    await this.delay();

    // Generate transactions from mock items if they exist
    const itemTransactions = this.mockItems
      .filter((item) => item.owner_id === userId)
      .map((item) => ({
        transaction_id: `mock-tx-item-${item.item_id}`,
        user_id: userId,
        type: 'deposit' as const,
        amount: item.value,
        item_id: item.item_id,
      item_details: {
        brand: item.brand,
        subcategory: item.subcategory,
        category: item.category,
        condition: item.condition,
      },
      status: 'completed' as const,
      description: `Deposited ${item.brand} ${item.subcategory}`,
      created_at: item.created_at,
    }));

    // Add some mock payment transactions
    const mockPayments = [
      {
        transaction_id: 'mock-tx-payment-1',
        user_id: userId,
        type: 'payment' as const,
        amount: 45.50,
        merchant_name: 'Coffee Shop',
        status: 'completed' as const,
        description: 'Payment to Coffee Shop',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        transaction_id: 'mock-tx-payment-2',
        user_id: userId,
        type: 'payment' as const,
        amount: 120.00,
        merchant_name: 'Grocery Store',
        status: 'completed' as const,
        description: 'Payment to Grocery Store',
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    // Combine and sort by date (newest first)
    return [...itemTransactions, ...mockPayments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createWallet(walletData: any): Promise<any> {
    console.log('[MOCK API] Creating wallet:', walletData);
    await this.delay();

    return {
      wallet_id: this.generateId(),
      ...walletData,
      balance: 0,
      created_at: new Date().toISOString(),
    };
  }

  // Generic catch-all for any other endpoints
  async mockRequest(endpoint: string, method: string, data?: any): Promise<any> {
    console.log(`[MOCK API] ${method} ${endpoint}`, data);
    await this.delay();

    return {
      success: true,
      message: 'Mock response',
      data: data || {},
    };
  }
}

export default new MockAPIService();
