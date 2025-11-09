import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MerchantInput() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');

  const handleNumberPress = (num: string) => {
    // Remove commas and decimals for length check
    const cleanAmount = amount.replace(/,/g, '').replace('.', '');
    
    // Limit to 6 digits before decimal
    if (num !== '.' && cleanAmount.length >= 6) return;
    
    if (num === '.' && amount.includes('.')) return; // Only one decimal
    
    if (num === '.' && amount === '') {
      setAmount('0.');
    } else {
      setAmount(amount + num);
    }
  };
  
  const formatAmount = (value: string) => {
    if (!value || value === '0') return '0';
    
    // Split by decimal
    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add commas to integer part
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Return with decimal if exists
    return decimalPart !== undefined ? `${formatted}.${decimalPart}` : formatted;
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleClear = () => {
    setAmount('');
  };

  const handleContinue = () => {
    const cleanAmount = amount.replace(/,/g, '');
    const amountNum = parseFloat(cleanAmount || '0');
    
    if (amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (amountNum > 999999) {
      Alert.alert('Amount Too Large', 'Please enter an amount less than $999,999');
      return;
    }

    router.push({
      pathname: '/payment/accept-payment',
      params: { amount: amountNum.toFixed(2), merchantId: user!.user_id, merchantName: user!.username }
    });
  };


  const displayAmount = formatAmount(amount || '0');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.label}>Accept payment</Text>
          
          <View style={styles.amountDisplay}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.amountText}>{displayAmount}</Text>
          </View>
        </View>

        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('1')}>
              <Text style={styles.keyText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('2')}>
              <Text style={styles.keyText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('3')}>
              <Text style={styles.keyText}>3</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('4')}>
              <Text style={styles.keyText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('5')}>
              <Text style={styles.keyText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('6')}>
              <Text style={styles.keyText}>6</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('7')}>
              <Text style={styles.keyText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('8')}>
              <Text style={styles.keyText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('9')}>
              <Text style={styles.keyText}>9</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('.')}>
              <Text style={styles.keyText}>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={() => handleNumberPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleDelete}>
              <Ionicons name="backspace-outline" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.continueButton, !amount && styles.continueButtonDisabled]} 
              onPress={handleContinue}
              disabled={!amount}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0EC57',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000',
    marginBottom: 30,
    textAlign: 'center',
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  currency: {
    fontSize: 72,
    fontWeight: '300',
    color: '#000',
    marginRight: 4,
  },
  amountText: {
    fontSize: 72,
    fontWeight: '300',
    color: '#000',
  },
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 40,
    marginBottom: 12,
  },
  key: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#000',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F0EC57',
  },
});
