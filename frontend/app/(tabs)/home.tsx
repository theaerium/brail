import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useItemStore } from '../../src/store/itemStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, fetchItems } = useItemStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchItems(user.user_id);
      }
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchItems(user.user_id);
    }
    setRefreshing(false);
  };

  // Calculate total account value
  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);

  // Mock transactions for display (you can replace with real data later)
  const mockTransactions = [
    {
      id: '1',
      name: "Mason Margeila Tabby's",
      status: 'Pending',
      time: 'Today',
      amount: 15.00,
      type: 'pending',
      icon: '👜'
    },
    {
      id: '2',
      name: 'Adam',
      status: 'Sent',
      time: 'Yesterday',
      amount: 5.00,
      type: 'sent',
      icon: 'arrow-up'
    },
    {
      id: '3',
      name: 'Starbucks Coffee, San Francisco',
      status: 'Complete',
      time: 'Yesterday',
      amount: 15.00,
      type: 'complete',
      icon: 'card'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Yellow Header Section */}
        <View style={styles.yellowHeader}>
          {/* Top Bar with Avatar and Menu */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
          </View>

          {/* Balance Label */}
          <View style={styles.balanceLabelContainer}>
            <View style={styles.balancePill}>
              <Text style={styles.balancePillText}>Balance</Text>
            </View>
          </View>

          {/* Balance Amount */}
          <View style={styles.balanceAmountContainer}>
            <Text style={styles.balanceAmount}>${totalValue.toFixed(2)}</Text>
            <View style={styles.underline} />
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/deposit/capture')}
          >
            <View style={styles.actionIconContainer}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="add" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Deposit</Text>
            </View>
            <Text style={styles.actionDescription}>
              Add items to fund your account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/payments')}
          >
            <View style={styles.actionIconContainer}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="arrow-up-outline" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Send</Text>
            </View>
            <Text style={styles.actionDescription}>
              Send money to a friend
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <Text style={styles.transactionsTitle}>Transactions</Text>

          {mockTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              {/* Icon */}
              <View style={styles.transactionIconContainer}>
                {transaction.icon === 'arrow-up' ? (
                  <View style={styles.transactionIcon}>
                    <Ionicons name="arrow-up" size={20} color="#000" />
                  </View>
                ) : transaction.icon === 'card' ? (
                  <View style={styles.transactionIcon}>
                    <Ionicons name="card" size={20} color="#000" />
                  </View>
                ) : (
                  <Text style={styles.transactionEmoji}>{transaction.icon}</Text>
                )}
              </View>

              {/* Details */}
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionName}>{transaction.name}</Text>
                <View style={styles.transactionStatusContainer}>
                  <Text style={styles.transactionStatus}>{transaction.status}</Text>
                  <Text style={styles.transactionDot}> • </Text>
                  <Text style={styles.transactionTime}>{transaction.time}</Text>
                </View>
              </View>

              {/* Amount */}
              <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  yellowHeader: {
    backgroundColor: '#F9ED32',
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    padding: 8,
    gap: 5,
  },
  menuLine: {
    width: 30,
    height: 3,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  balanceLabelContainer: {
    marginBottom: 16,
  },
  balancePill: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  balancePillText: {
    color: '#F9ED32',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceAmountContainer: {
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -2,
  },
  underline: {
    height: 4,
    backgroundColor: '#00D4FF',
    marginTop: 4,
    borderRadius: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D0D0D0',
    minHeight: 140,
  },
  actionIconContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  transactionsSection: {
    backgroundColor: '#FFF',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  transactionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionIconContainer: {
    marginRight: 16,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionEmoji: {
    fontSize: 32,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionStatus: {
    fontSize: 13,
    color: '#999',
  },
  transactionDot: {
    fontSize: 13,
    color: '#999',
  },
  transactionTime: {
    fontSize: 13,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
