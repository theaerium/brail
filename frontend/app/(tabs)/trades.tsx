import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Trades() {
  const { user } = useAuthStore();
  const [trades, setTrades] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch trades from API
    setRefreshing(false);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="swap-horizontal-outline" size={80} color="#CCC" />
      <Text style={styles.emptyTitle}>No Trades Yet</Text>
      <Text style={styles.emptyText}>
        Your trade history will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={trades}
        renderItem={null}
        keyExtractor={(item: any) => item.trade_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  list: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
