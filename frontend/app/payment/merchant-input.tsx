import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function MerchantInput() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');

  const handleContinue = () => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (amountNum > 10000) {
      Alert.alert('Amount Too Large', 'Please enter an amount less than $10,000');
      return;
    }

    router.push({
      pathname: '/payment/accept-payment',
      params: { amount: amountNum.toFixed(2), merchantId: user!.user_id, merchantName: user!.username }
    });
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
        <Text style={styles.title}>Accept Payment</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.merchantInfo}>
          <Ionicons name="storefront" size={48} color="#007AFF" />
          <Text style={styles.merchantName}>{user?.username}</Text>
          <Text style={styles.merchantLabel}>Merchant</Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.label}>Transaction Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Customer will tap their phone or NFC card to pay with their items
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !amount && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!amount}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  merchantInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  merchantLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  amountSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F0F8FF',
  },
  currency: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    paddingVertical: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
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
