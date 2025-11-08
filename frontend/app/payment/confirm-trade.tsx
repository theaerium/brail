import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { OfflineTradeService } from '../../src/services/OfflineTradeService';
import { useItemStore } from '../../src/store/itemStore';
import { Ionicons } from '@expo/vector-icons';

export default function ConfirmTrade() {
  const router = useRouter();
  const {
    amount,
    merchantId,
    merchantName,
    customerId,
    customerName,
    tradeItems: tradeItemsStr,
  } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
    customerId: string;
    customerName: string;
    tradeItems: string;
  }>();

  const { updateItem } = useItemStore();
  const [customerPin, setCustomerPin] = useState('');
  const [merchantPin, setMerchantPin] = useState('');
  const [customerAuthed, setCustomerAuthed] = useState(false);
  const [merchantAuthed, setMerchantAuthed] = useState(false);
  const [processing, setProcessing] = useState(false);

  const tradeItems = JSON.parse(tradeItemsStr || '[]');

  const handleBiometricAuth = async (isCustomer: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Biometric Not Available', 'Please use PIN authentication');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate as ${isCustomer ? 'Customer' : 'Merchant'}`,
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        if (isCustomer) {
          setCustomerAuthed(true);
          Alert.alert('Success', 'Customer authenticated');
        } else {
          setMerchantAuthed(true);
          Alert.alert('Success', 'Merchant authenticated');
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handlePinAuth = async (pin: string, isCustomer: boolean) => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    // In production, verify PIN against stored hash
    if (isCustomer) {
      setCustomerAuthed(true);
      Alert.alert('Success', 'Customer authenticated');
    } else {
      setMerchantAuthed(true);
      Alert.alert('Success', 'Merchant authenticated');
    }
  };

  const handleConfirmTrade = async () => {
    if (!customerAuthed || !merchantAuthed) {
      Alert.alert('Authentication Required', 'Both parties must authenticate');
      return;
    }

    setProcessing(true);

    try {
      // Generate signatures
      const customerSig = await OfflineTradeService.generateSignature(
        { tradeItems, timestamp: Date.now() },
        customerPin || 'biometric'
      );

      const merchantSig = await OfflineTradeService.generateSignature(
        { tradeItems, timestamp: Date.now() },
        merchantPin || 'biometric'
      );

      // Record trade offline
      const trade = await OfflineTradeService.recordTrade(
        customerId,
        customerName,
        merchantId,
        merchantName,
        tradeItems,
        customerSig,
        merchantSig
      );

      // Update item ownership locally (optimistic update)
      for (const item of tradeItems) {
        await updateItem(item.item_id, {
          owner_id: merchantId,
          share_percentage: 1.0 - item.share_percentage,
        });
      }

      Alert.alert(
        'Trade Complete!',
        `Successfully traded items worth $${amount}\\n\\nTrade will sync when online.`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/(tabs)/inventory'),
          },
        ]
      );
    } catch (error) {
      console.error('Trade error:', error);
      Alert.alert('Trade Failed', 'Failed to complete trade. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Trade</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.tradeDetails}>
            <Text style={styles.sectionTitle}>Trade Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>${amount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From:</Text>
              <Text style={styles.detailValue}>{customerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailValue}>{merchantName}</Text>
            </View>
          </View>

          <View style={styles.itemsList}>
            <Text style={styles.sectionTitle}>Items Being Traded:</Text>
            {tradeItems.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemPercentage}>
                    {(item.share_percentage * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.itemValue}>${item.value.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.authSection}>
            <Text style={styles.sectionTitle}>Authentication</Text>
            
            {/* Customer Authentication */}
            <View style={styles.authCard}>
              <View style={styles.authHeader}>
                <Ionicons name="person" size={24} color="#007AFF" />
                <Text style={styles.authTitle}>Customer</Text>
                {customerAuthed && (
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                )}
              </View>
              
              {!customerAuthed && (
                <>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={() => handleBiometricAuth(true)}
                  >
                    <Ionicons name="finger-print" size={24} color="#007AFF" />
                    <Text style={styles.biometricText}>Use Biometric</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.pinInput}>
                    <TextInput
                      style={styles.pinField}
                      placeholder="Or enter PIN"
                      value={customerPin}
                      onChangeText={setCustomerPin}
                      secureTextEntry
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.pinButton}
                      onPress={() => handlePinAuth(customerPin, true)}
                    >
                      <Text style={styles.pinButtonText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Merchant Authentication */}
            <View style={styles.authCard}>
              <View style={styles.authHeader}>
                <Ionicons name="storefront" size={24} color="#007AFF" />
                <Text style={styles.authTitle}>Merchant</Text>
                {merchantAuthed && (
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                )}
              </View>
              
              {!merchantAuthed && (
                <>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={() => handleBiometricAuth(false)}
                  >
                    <Ionicons name="finger-print" size={24} color="#007AFF" />
                    <Text style={styles.biometricText}>Use Biometric</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.pinInput}>
                    <TextInput
                      style={styles.pinField}
                      placeholder="Or enter PIN"
                      value={merchantPin}
                      onChangeText={setMerchantPin}
                      secureTextEntry
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.pinButton}
                      onPress={() => handlePinAuth(merchantPin, false)}
                    >
                      <Text style={styles.pinButtonText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!customerAuthed || !merchantAuthed) && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmTrade}
            disabled={!customerAuthed || !merchantAuthed || processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Complete Trade</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 24,
  },
  tradeDetails: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  itemsList: {
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  itemPercentage: {
    fontSize: 14,
    color: '#666',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  authSection: {
    marginBottom: 24,
  },
  authCard: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
    marginBottom: 12,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  pinInput: {
    flexDirection: 'row',
    gap: 12,
  },
  pinField: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  pinButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
  },
  pinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
