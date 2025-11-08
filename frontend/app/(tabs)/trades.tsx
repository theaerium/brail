import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { OfflineTradeService } from '../../src/services/OfflineTradeService';
import { Ionicons } from '@expo/vector-icons';

export default function Payments() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [trades, setTrades] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    const pendingTrades = await OfflineTradeService.getPendingTrades();
    setTrades(pendingTrades);
    setPendingCount(pendingTrades.filter(t => t.status === 'pending').length);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrades();
    // Try to sync if online
    try {
      await OfflineTradeService.syncPendingTrades();
      await loadTrades(); // Reload after sync
    } catch (error) {
      console.log('Sync failed - may be offline');
    }
    setRefreshing(false);
  };

  const renderTradeItem = ({ item }: any) => (
    <View style={styles.tradeCard}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeIcon}>
          <Ionicons 
            name={item.payer_id === user?.user_id ? 'arrow-up' : 'arrow-down'} 
            size={24} 
            color={item.payer_id === user?.user_id ? '#FF3B30' : '#34C759'} 
          />
        </View>
        <View style={styles.tradeInfo}>
          <Text style={styles.tradeTitle}>
            {item.payer_id === user?.user_id ? 'Paid to' : 'Received from'}
          </Text>
          <Text style={styles.tradeName}>
            {item.payer_id === user?.user_id ? item.payee_name : item.payer_name}
          </Text>
        </View>
        <View style={styles.tradeAmount}>
          <Text style={styles.tradeValue}>${item.total_value.toFixed(2)}</Text>
          {item.status === 'pending' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.tradeDetails}>
        <Text style={styles.tradeItemsLabel}>
          {item.items.length} item{item.items.length > 1 ? 's' : ''} traded
        </Text>
        <Text style={styles.tradeDate}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Accept Payment Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.acceptPaymentButton}
            onPress={() => router.push('/payment/merchant-input')}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIcon}>
                <Ionicons name="card" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.buttonText}>
                <Text style={styles.buttonTitle}>Accept Payment</Text>
                <Text style={styles.buttonSubtitle}>Start receiving payments with NFC</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Trades Alert */}
        {pendingCount > 0 && (
          <View style={styles.alertBox}>
            <Ionicons name="alert-circle" size={24} color="#FF9500" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Offline Trades</Text>
              <Text style={styles.alertText}>
                {pendingCount} trade{pendingCount > 1 ? 's' : ''} pending sync
              </Text>
            </View>
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="sync" size={24} color="#FF9500" />
            </TouchableOpacity>
          </View>
        )}

        {/* Trade History Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trade History</Text>
            <Text style={styles.sectionCount}>{trades.length}</Text>
          </View>

          {trades.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>No Trades Yet</Text>
              <Text style={styles.emptyText}>
                Start accepting payments or trading items
              </Text>
            </View>
          ) : (
            <FlatList
              data={trades}
              renderItem={renderTradeItem}
              keyExtractor={(item) => item.trade_id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  actionSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  acceptPaymentButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  buttonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
  },
  historySection: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tradeInfo: {
    flex: 1,
  },
  tradeTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tradeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  tradeAmount: {
    alignItems: 'flex-end',
  },
  tradeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tradeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tradeItemsLabel: {
    fontSize: 14,
    color: '#666',
  },
  tradeDate: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
