import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useItemStore } from '../../src/store/itemStore';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { OfflineTradeService } from '../../src/services/OfflineTradeService';

export default function AcceptPayment() {
  const router = useRouter();
  const { amount, merchantId, merchantName } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
  }>();
  
  const { items, updateItem } = useItemStore();
  const { user } = useAuthStore();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [transactionDenied, setTransactionDenied] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  
  // Authentication states
  const [authStep, setAuthStep] = useState<'none' | 'customer' | 'merchant' | 'complete'>('none');
  const [customerPin, setCustomerPin] = useState('');
  const [merchantPin, setMerchantPin] = useState('');
  const [customerAuthed, setCustomerAuthed] = useState(false);
  const [merchantAuthed, setMerchantAuthed] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const ring3Anim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0)).current;

  // Handle biometric authentication
  const handleBiometricAuth = async (isCustomer: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // No biometric hardware, user must use PIN
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate as ${isCustomer ? 'Customer' : 'Merchant'}`,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        if (isCustomer) {
          setCustomerAuthed(true);
          // Auto-trigger merchant auth
          setTimeout(() => {
            setAuthStep('merchant');
            handleBiometricAuth(false);
          }, 500);
        } else {
          setMerchantAuthed(true);
          // Complete transaction
          completeTrade('biometric', 'biometric');
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  // Handle PIN submission
  const handlePinSubmit = async (pin: string, isCustomer: boolean) => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    if (isCustomer) {
      setCustomerAuthed(true);
      setCustomerPin(pin);
      // Auto-trigger merchant auth
      setTimeout(() => {
        setAuthStep('merchant');
        handleBiometricAuth(false);
      }, 500);
    } else {
      setMerchantAuthed(true);
      setMerchantPin(pin);
      // Complete transaction
      completeTrade(customerPin || 'biometric', pin);
    }
  };

  // Complete the trade
  const completeTrade = async (custPin: string, merchPin: string) => {
    setProcessing(true);
    setAuthStep('complete');

    try {
      // Generate signatures
      const customerSig = await OfflineTradeService.generateSignature(
        { tradeItems: selectedItems, timestamp: Date.now() },
        custPin
      );

      const merchantSig = await OfflineTradeService.generateSignature(
        { tradeItems: selectedItems, timestamp: Date.now() },
        merchPin
      );

      // Record trade offline
      await OfflineTradeService.recordTrade(
        user!.user_id,
        user!.username,
        merchantId as string,
        merchantName as string,
        selectedItems,
        customerSig,
        merchantSig
      );

      // Update item ownership locally
      for (const item of selectedItems) {
        await updateItem(item.item_id, {
          owner_id: merchantId as string,
          share_percentage: 1.0 - item.share_percentage,
        });
      }

      // Show success and navigate
      setTimeout(() => {
        Alert.alert(
          'Trade Complete!',
          `Successfully traded items worth $${amount}\n\nTrade will sync when online.`,
          [
            {
              text: 'Done',
              onPress: () => router.replace('/(tabs)/inventory'),
            },
          ]
        );
      }, 1000);
    } catch (error) {
      console.error('Trade error:', error);
      Alert.alert('Trade Failed', 'Failed to complete trade. Please try again.');
      setProcessing(false);
    }
  };

  useEffect(() => {
    // Calculate total value of customer's items
    const amountNum = parseFloat(amount || '0');
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);

    // Start pulsing animation
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const ring1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1Anim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Anim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const ring2Animation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(ring2Anim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ring2Anim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const ring3Animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(ring3Anim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ring3Anim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulsing.start();
    ring1Animation.start();
    ring2Animation.start();
    ring3Animation.start();

    // After 3 seconds, check balance and proceed
    const timer = setTimeout(() => {
      pulsing.stop();
      ring1Animation.stop();
      ring2Animation.stop();
      ring3Animation.stop();

      // Check if customer has enough value
      if (totalValue < amountNum) {
        // Transaction denied - insufficient funds
        setTransactionDenied(true);
        setAnimationComplete(true);
        return;
      }

      // Auto-select items to cover the payment amount
      const selectedItems: any[] = [];
      let runningTotal = 0;

      // Sort items by value (descending) for optimal selection
      const sortedItems = [...items].sort((a, b) => b.value - a.value);

      for (const item of sortedItems) {
        if (runningTotal >= amountNum) break;

        const remainingAmount = amountNum - runningTotal;
        
        if (item.value <= remainingAmount) {
          // Use 100% of item
          selectedItems.push({
            item_id: item.item_id,
            item_name: `${item.brand} ${item.subcategory}`,
            share_percentage: 1.0,
            value: item.value,
            previous_owner: user!.user_id,
            new_owner: merchantId,
          });
          runningTotal += item.value;
        } else if (runningTotal < amountNum) {
          // Use partial percentage of item
          const percentage = remainingAmount / item.value;
          selectedItems.push({
            item_id: item.item_id,
            item_name: `${item.brand} ${item.subcategory}`,
            share_percentage: percentage,
            value: remainingAmount,
            previous_owner: user!.user_id,
            new_owner: merchantId,
          });
          runningTotal += remainingAmount;
        }
      }

      // Store selected items
      setSelectedItems(selectedItems);

      // Animate checkmark and splash
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(splashScale, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(splashScale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setAnimationComplete(true);
        // Auto-trigger customer authentication after animation
        setTimeout(() => {
          setAuthStep('customer');
          handleBiometricAuth(true);
        }, 500);
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      pulsing.stop();
      ring1Animation.stop();
      ring2Animation.stop();
      ring3Animation.stop();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
      
      <View style={styles.amountSection}>
        <Text style={styles.amountText}>${amount}</Text>
      </View>

      <View style={styles.centerContent}>
        {!animationComplete ? (
          <View style={styles.animationContainer}>
            {/* Pulsing Rings */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: ring1Anim }],
                  opacity: ring1Anim.interpolate({
                    inputRange: [1, 1.3],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: ring2Anim }],
                  opacity: ring2Anim.interpolate({
                    inputRange: [1, 1.3],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: ring3Anim }],
                  opacity: ring3Anim.interpolate({
                    inputRange: [1, 1.3],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            
            {/* Center Ring */}
            <Animated.View
              style={[
                styles.centerRing,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>
        ) : transactionDenied ? (
          <View style={styles.deniedContainer}>
            <View style={styles.deniedIconContainer}>
              <Ionicons name="close-circle" size={120} color="#FF3B30" />
            </View>
            <Text style={styles.deniedTitle}>Transaction Denied</Text>
            <Text style={styles.deniedMessage}>Insufficient funds in account</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.animationContainer}>
            {/* Splash effect */}
            <Animated.View
              style={[
                styles.splash,
                {
                  transform: [{ scale: splashScale }],
                },
              ]}
            />
            
            {/* Checkmark */}
            <Animated.View
              style={[
                styles.checkmarkContainer,
                {
                  transform: [{ scale: checkmarkScale }],
                },
              ]}
            >
              <Ionicons name="checkmark" size={100} color="#000" />
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0EC57',
  },
  amountSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  amountText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#000',
  },
  centerRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: 'transparent',
  },
  splash: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#000',
    opacity: 0.1,
  },
  checkmarkContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deniedContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  deniedIconContainer: {
    marginBottom: 30,
  },
  deniedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  deniedMessage: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  backButtonText: {
    color: '#F0EC57',
    fontSize: 18,
    fontWeight: '600',
  },
});
