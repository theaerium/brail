import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useItemStore } from '../../src/store/itemStore';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AcceptPayment() {
  const router = useRouter();
  const { amount, merchantId, merchantName } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
  }>();
  
  const { items } = useItemStore();
  const { user } = useAuthStore();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [transactionDenied, setTransactionDenied] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const ring3Anim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0)).current;

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
        // Navigate to transaction summary after animation completes
        setTimeout(() => {
          router.push({
            pathname: '/payment/confirm-trade',
            params: {
              amount,
              merchantId,
              merchantName,
              customerId: user!.user_id,
              customerName: user!.username,
              tradeItems: JSON.stringify(selectedItems),
            }
          });
        }, 1000);
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
});
