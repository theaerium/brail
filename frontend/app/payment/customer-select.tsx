import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useItemStore } from '../../src/store/itemStore';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerSelect() {
  const router = useRouter();
  const { amount, merchantId, merchantName } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
  }>();
  
  const { user } = useAuthStore();
  const { items } = useItemStore();
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [customPercentages, setCustomPercentages] = useState<Map<string, string>>(new Map());

  const amountNum = parseFloat(amount || '0');
  const totalSelected = Array.from(selectedItems.entries()).reduce(
    (sum, [itemId, percentage]) => {
      const item = items.find(i => i.item_id === itemId);
      return sum + (item ? item.value * percentage : 0);
    },
    0
  );

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newPercentages = new Map(customPercentages);
      newPercentages.delete(itemId);
      setCustomPercentages(newPercentages);
    } else {
      newSelected.set(itemId, 1.0); // 100% by default
    }
    setSelectedItems(newSelected);
  };

  const updatePercentage = (itemId: string, value: string) => {
    const newPercentages = new Map(customPercentages);
    newPercentages.set(itemId, value);
    setCustomPercentages(newPercentages);

    const percentage = parseFloat(value) / 100;
    if (!isNaN(percentage) && percentage > 0 && percentage <= 1) {
      const newSelected = new Map(selectedItems);
      newSelected.set(itemId, percentage);
      setSelectedItems(newSelected);
    }
  };

  const handleContinue = () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to pay with');
      return;
    }

    if (totalSelected < amountNum) {
      Alert.alert(
        'Insufficient Value',
        `Selected items total $${totalSelected.toFixed(2)} but payment requires $${amountNum}`,
        [
          { text: 'OK' },
        ]
      );
      return;
    }

    // Build trade items array
    const tradeItems = Array.from(selectedItems.entries()).map(([itemId, percentage]) => {
      const item = items.find(i => i.item_id === itemId)!;
      return {
        item_id: itemId,
        item_name: `${item.brand} ${item.subcategory}`,
        share_percentage: percentage,
        value: item.value * percentage,
        previous_owner: user!.user_id,
        new_owner: merchantId,
      };
    });

    router.push({
      pathname: '/payment/confirm-trade',
      params: {
        amount,
        merchantId,
        merchantName,
        customerId: user!.user_id,
        customerName: user!.username,
        tradeItems: JSON.stringify(tradeItems),
      }
    });
  };

  const renderItem = ({ item }: any) => {
    const isSelected = selectedItems.has(item.item_id);
    const percentage = selectedItems.get(item.item_id) || 1.0;
    const contributedValue = item.value * percentage;

    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}
        onPress={() => toggleItemSelection(item.item_id)}
      >
        <Image source={{ uri: item.photo }} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.brand} {item.subcategory}</Text>
          <Text style={styles.itemValue}>Total Value: ${item.value.toFixed(2)}</Text>
          
          {isSelected && (
            <View style={styles.percentageInput}>
              <Text style={styles.percentageLabel}>Use:</Text>
              <TextInput
                style={styles.percentageField}
                value={customPercentages.get(item.item_id) || '100'}
                onChangeText={(value) => updatePercentage(item.item_id, value)}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.percentageSymbol}>%</Text>
              <Text style={styles.contributedValue}>(${contributedValue.toFixed(2)})</Text>
            </View>
          )}
        </View>
        
        <View style={styles.checkbox}>
          {isSelected && <Ionicons name="checkmark" size={24} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Items</Text>
      </View>

      <View style={styles.paymentInfo}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount Due:</Text>
          <Text style={styles.paymentAmount}>${amountNum.toFixed(2)}</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Selected:</Text>
          <Text style={[styles.paymentSelected, totalSelected >= amountNum && styles.paymentSelectedGood]}>
            ${totalSelected.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.merchantText}>Paying to: {merchantName}</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.item_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No items in inventory</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedItems.size === 0 || totalSelected < amountNum) && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={selectedItems.size === 0 || totalSelected < amountNum}
        >
          <Text style={styles.continueButtonText}>Continue to Confirm</Text>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  paymentInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentSelected: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  paymentSelectedGood: {
    color: '#34C759',
  },
  merchantText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  percentageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageLabel: {
    fontSize: 14,
    color: '#666',
  },
  percentageField: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 6,
    width: 50,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  percentageSymbol: {
    fontSize: 14,
    color: '#666',
  },
  contributedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#CCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
