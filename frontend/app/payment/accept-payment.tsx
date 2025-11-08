import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useItemStore } from '../../src/store/itemStore';
import { Ionicons } from '@expo/vector-icons';

export default function AcceptPayment() {
  const router = useRouter();
  const { amount, merchantId, merchantName } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
  }>();
  
  const { items } = useItemStore();
  const [waiting, setWaiting] = useState(true);
  const [simulatingRead, setSimulatingRead] = useState(false);

  useEffect(() => {
    // In real device, NFC reader would be active here
    // For now, we'll simulate the wait
  }, []);

  const simulateCustomerTap = () => {
    setSimulatingRead(true);
    
    // Simulate NFC read delay
    setTimeout(() => {
      setSimulatingRead(false);
      
      // Navigate to customer item selection
      router.push({
        pathname: '/payment/customer-select',
        params: {
          amount,
          merchantId,
          merchantName,
        }
      });
    }, 1500);
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.amountDisplay}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>${amount}</Text>
        </View>

        {!simulatingRead ? (
          <>
            <View style={styles.nfcIcon}>
              <Ionicons name="phone-portrait" size={120} color="#007AFF" />
              <View style={styles.pulse} />
            </View>

            <Text style={styles.waitingText}>Waiting for customer...</Text>
            <Text style={styles.instructionText}>
              Ask customer to tap their phone or NFC card
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How it works:</Text>
                <Text style={styles.infoText}>
                  1. Customer taps their phone/card{' \n'}
                  2. Their items load automatically{' \n'}
                  3. They select items to pay with{' \n'}
                  4. Both parties confirm the trade
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.simulateButton}
              onPress={simulateCustomerTap}
            >
              <Ionicons name="play-circle" size={24} color="#FFFFFF" />
              <Text style={styles.simulateButtonText}>Simulate Customer Tap</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.readingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.readingText}>Reading NFC...</Text>
            <Text style={styles.readingHint}>Loading customer items</Text>
          </View>
        )}
      </View>
    </View>
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
    alignItems: 'center',
  },
  amountDisplay: {
    backgroundColor: '#F0F8FF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  amountLabel: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  nfcIcon: {
    position: 'relative',
    marginVertical: 40,
  },
  pulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.3,
  },
  waitingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    width: '100%',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 20,
  },
  simulateButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  readingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
  },
  readingHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
