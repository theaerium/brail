import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useItemStore } from "../../src/store/itemStore";
import { useAuthStore } from "../../src/store/authStore";
import { useTransactionStore } from "../../src/store/transactionStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import { OfflineTradeService } from "../../src/services/OfflineTradeService";
import LottieView from "lottie-react-native";
import NFCService from "../../src/services/NFCService";
import { isNFCAvailable } from "../../src/services/NFCManager";

export default function AcceptPayment() {
  const router = useRouter();
  const { amount, merchantId, merchantName } = useLocalSearchParams<{
    amount: string;
    merchantId: string;
    merchantName: string;
  }>();

  const { items, updateItem } = useItemStore();
  const { user } = useAuthStore();
  const { createTransaction } = useTransactionStore();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [transactionDenied, setTransactionDenied] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReadComplete, setNfcReadComplete] = useState(false);
  const [customerIdFromNFC, setCustomerIdFromNFC] = useState<string>("");

  // Authentication states
  const [authStep, setAuthStep] = useState<
    "none" | "customer" | "merchant" | "complete"
  >("none");
  const [customerPin, setCustomerPin] = useState("");
  const [merchantPin, setMerchantPin] = useState("");
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
        promptMessage: `Authenticate as ${isCustomer ? "Customer" : "Merchant"}`,
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
      });

      if (result.success) {
        if (isCustomer) {
          setCustomerAuthed(true);
          // Auto-trigger merchant auth
          setTimeout(() => {
            setAuthStep("merchant");
            handleBiometricAuth(false);
          }, 500);
        } else {
          setMerchantAuthed(true);
          // Complete transaction
          completeTrade("biometric", "biometric");
        }
      }
    } catch (error) {
      console.error("Biometric auth error:", error);
    }
  };

  // Handle PIN submission
  const handlePinSubmit = async (pin: string, isCustomer: boolean) => {
    if (pin.length < 4) {
      Alert.alert("Invalid PIN", "PIN must be at least 4 digits");
      return;
    }

    if (isCustomer) {
      setCustomerAuthed(true);
      setCustomerPin(pin);
      // Auto-trigger merchant auth
      setTimeout(() => {
        setAuthStep("merchant");
        handleBiometricAuth(false);
      }, 500);
    } else {
      setMerchantAuthed(true);
      setMerchantPin(pin);
      // Complete transaction
      completeTrade(customerPin || "biometric", pin);
    }
  };

  // Complete the trade
  const completeTrade = async (custPin: string, merchPin: string) => {
    setProcessing(true);
    setAuthStep("complete");

    try {
      // Generate signatures
      const customerSig = await OfflineTradeService.generateSignature(
        { tradeItems: selectedItems, timestamp: Date.now() },
        custPin,
      );

      const merchantSig = await OfflineTradeService.generateSignature(
        { tradeItems: selectedItems, timestamp: Date.now() },
        merchPin,
      );

      // Record trade offline
      await OfflineTradeService.recordTrade(
        user!.user_id,
        user!.username,
        merchantId as string,
        merchantName as string,
        selectedItems,
        customerSig,
        merchantSig,
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
          "Trade Complete!",
          `Successfully traded items worth $${amount}\n\nTrade will sync when online.`,
          [
            {
              text: "Done",
              onPress: () => router.replace("/(tabs)/inventory"),
            },
          ],
        );
      }, 1000);
    } catch (error) {
      console.error("Trade error:", error);
      Alert.alert(
        "Trade Failed",
        "Failed to complete trade. Please try again.",
      );
      setProcessing(false);
    }
  };

  // Complete NFC payment after confirmation
  const completeNFCPayment = async () => {
    setProcessing(true);

    try {
      const amountNum = parseFloat(amount || "0");

      // Transfer items on the server
      for (const item of selectedItems) {
        await updateItem(item.item_id, {
          owner_id: merchantId as string,
          share_percentage: 1.0 - item.share_percentage,
        });
      }

      // Create transaction for CUSTOMER (person paying) - type: "payment"
      await createTransaction({
        user_id: customerIdFromNFC,
        type: "payment",
        amount: amountNum,
        merchant_name: merchantName as string,
        status: "completed",
        description: `Spent at ${merchantName}`,
      });

      // Create transaction for MERCHANT (person receiving) - type: "refund" (acts as income)
      await createTransaction({
        user_id: merchantId as string,
        type: "refund",
        amount: amountNum,
        merchant_name: "Customer",
        status: "completed",
        description: `Received payment from customer`,
      });

      // Show success
      setProcessing(false);
      Alert.alert(
        "Payment Complete!",
        `Successfully received $${amount}\n\nCustomer paid via NFC.\nItems transferred and transactions recorded.`,
        [
          {
            text: "Done",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ],
      );
    } catch (error) {
      console.error("Payment error:", error);
      setProcessing(false);
      Alert.alert(
        "Payment Failed",
        "Failed to complete payment. Please try again.",
      );
    }
  };

  // Check NFC support
  const checkNFCSupport = async () => {
    if (!isNFCAvailable) {
      setNfcSupported(false);
      return;
    }

    try {
      const supported = await NFCService.init();
      setNfcSupported(supported);
    } catch (error) {
      console.error("NFC check failed:", error);
      setNfcSupported(false);
    }
  };

  // Handle NFC tap for payment
  const handleNFCTap = async () => {
    if (!nfcSupported || !isNFCAvailable) {
      Alert.alert(
        "NFC Not Available",
        "NFC payment requires a development build on a device with NFC support. Please use PIN authentication instead.",
        [
          {
            text: "Use PIN",
            onPress: () => {
              // Trigger the normal authentication flow
              setAnimationComplete(true);
              setTimeout(() => setAuthStep("customer"), 300);
            },
          },
        ],
      );
      return;
    }

    setNfcScanning(true);

    try {
      // Read NFC tag to get user's wallet/payment info
      const tagData = await NFCService.readItemTag();

      setNfcScanning(false);

      // Get the customer's user ID from the NFC tag
      const customerIdFromTag = tagData.owner_id;

      // Verify customer has an account (tag has valid user ID)
      if (!customerIdFromTag) {
        Alert.alert(
          "Invalid Card",
          "This card doesn't have valid payment information.",
          [{ text: "Try Again", onPress: handleNFCTap }],
        );
        return;
      }

      // NFC authentication successful - process payment
      const amountNum = parseFloat(amount || "0");

      // Get customer's items from the server
      const { items: customerItems } = useItemStore.getState();

      // Check if customer has enough value
      const totalCustomerValue = customerItems
        .filter((item) => item.owner_id === customerIdFromTag)
        .reduce((sum, item) => sum + item.value, 0);

      if (totalCustomerValue < amountNum) {
        Alert.alert(
          "Insufficient Funds",
          `Customer doesn't have enough items to cover $${amount}.\n\nCustomer balance: $${totalCustomerValue.toFixed(2)}`,
          [{ text: "OK" }],
        );
        return;
      }

      // Auto-select items to cover the payment amount
      const itemsToTransfer: any[] = [];
      let runningTotal = 0;

      // Sort items by value (descending) for optimal selection
      const sortedItems = [...customerItems]
        .filter((item) => item.owner_id === customerIdFromTag)
        .sort((a, b) => b.value - a.value);

      for (const item of sortedItems) {
        if (runningTotal >= amountNum) break;

        const remainingAmount = amountNum - runningTotal;

        if (item.value <= remainingAmount) {
          // Transfer 100% of item
          itemsToTransfer.push({
            item_id: item.item_id,
            item_name: `${item.brand} ${item.subcategory}`,
            share_percentage: 1.0,
            value: item.value,
            previous_owner: customerIdFromTag,
            new_owner: merchantId,
          });
          runningTotal += item.value;
        } else if (runningTotal < amountNum) {
          // Transfer partial percentage of item
          const percentage = remainingAmount / item.value;
          itemsToTransfer.push({
            item_id: item.item_id,
            item_name: `${item.brand} ${item.subcategory}`,
            share_percentage: percentage,
            value: remainingAmount,
            previous_owner: customerIdFromTag,
            new_owner: merchantId,
          });
          runningTotal += remainingAmount;
        }
      }

      // Store selected items and customer ID for confirmation screen
      setSelectedItems(itemsToTransfer);
      setCustomerIdFromNFC(customerIdFromTag);

      // Show confirmation screen with transfer details
      setNfcReadComplete(true);
      setAnimationComplete(true);
    } catch (error: any) {
      setNfcScanning(false);
      console.error("NFC payment failed:", error);
      Alert.alert(
        "Payment Failed",
        error.message ||
          "Failed to process NFC payment. Please try again or use PIN.",
        [
          { text: "Retry", onPress: handleNFCTap },
          {
            text: "Use PIN",
            onPress: () => {
              setAnimationComplete(true);
              setTimeout(() => setAuthStep("customer"), 300);
            },
          },
        ],
      );
    }
  };

  useEffect(() => {
    checkNFCSupport();
  }, []);

  useEffect(() => {
    // Auto-start NFC scanning when screen loads
    const startNFCScanning = async () => {
      // Wait a moment for the animation to appear
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Automatically trigger NFC scanning
      if (nfcSupported && isNFCAvailable) {
        handleNFCTap();
      }
    };

    if (nfcSupported) {
      startNFCScanning();
    }
  }, [nfcSupported]);

  useEffect(() => {
    // Calculate total value of customer's items
    const amountNum = parseFloat(amount || "0");
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
      ]),
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
      ]),
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
      ]),
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
      ]),
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
          setAuthStep("customer");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show NFC payment confirmation screen
  if (nfcReadComplete && !processing) {
    return (
      <SafeAreaView
        style={styles.authContainer}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authTopSection}>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            <Text style={styles.authAmountLarge}>${amount}</Text>
            <Text style={styles.authLabel}>NFC Card Read Successfully</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Items to Transfer:</Text>
            {selectedItems.map((item: any, index: number) => (
              <View key={index} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryItemName}>{item.item_name}</Text>
                  <Text style={styles.summaryItemPercentage}>
                    {(item.share_percentage * 100).toFixed(0)}% of item
                  </Text>
                </View>
                <Text style={styles.summaryItemValue}>
                  ${item.value.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalAmount}>${amount}</Text>
            </View>
          </View>

          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setNfcReadComplete(false);
                setAnimationComplete(false);
                setSelectedItems([]);
                setCustomerIdFromNFC("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={completeNFCPayment}
            >
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render different screens based on auth step
  if (authStep === "customer" && !customerAuthed) {
    return (
      <SafeAreaView
        style={styles.authContainer}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authTopSection}>
            <Text style={styles.authAmountLarge}>${amount}</Text>
            <Text style={styles.authLabel}>Customer, confirm your payment</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Paying with:</Text>
            {selectedItems.map((item: any, index: number) => (
              <View key={index} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryItemName}>{item.item_name}</Text>
                  <Text style={styles.summaryItemPercentage}>
                    {(item.share_percentage * 100).toFixed(0)}% of item
                  </Text>
                </View>
                <Text style={styles.summaryItemValue}>
                  ${item.value.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.pinSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="finger-print" size={40} color="#000" />
            </View>
            <Text style={styles.pinLabel}>Enter your PIN</Text>
            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                placeholder="••••••"
                placeholderTextColor="#999"
                value={customerPin}
                onChangeText={setCustomerPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                onSubmitEditing={() => handlePinSubmit(customerPin, true)}
              />
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handlePinSubmit(customerPin, true)}
            >
              <Text style={styles.submitButtonText}>Authorize Payment</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (authStep === "merchant" && !merchantAuthed) {
    return (
      <SafeAreaView
        style={styles.authContainer}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authTopSection}>
            <Text style={styles.authAmountLarge}>${amount}</Text>
            <Text style={styles.authLabel}>Merchant, confirm receipt</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Receiving:</Text>
            {selectedItems.map((item: any, index: number) => (
              <View key={index} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryItemName}>{item.item_name}</Text>
                  <Text style={styles.summaryItemPercentage}>
                    {(item.share_percentage * 100).toFixed(0)}% of item
                  </Text>
                </View>
                <Text style={styles.summaryItemValue}>
                  ${item.value.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.pinSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#000" />
            </View>
            <Text style={styles.pinLabel}>Enter your PIN</Text>
            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                placeholder="••••••"
                placeholderTextColor="#999"
                value={merchantPin}
                onChangeText={setMerchantPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                onSubmitEditing={() => handlePinSubmit(merchantPin, false)}
              />
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handlePinSubmit(merchantPin, false)}
            >
              <Text style={styles.submitButtonText}>Accept Payment</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (authStep === "complete" && processing) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />
        <View style={styles.centerContent}>
          <View style={styles.processingContainer}>
            <Ionicons name="checkmark-circle" size={120} color="#34C759" />
            <Text style={styles.processingTitle}>Processing Trade...</Text>
            <Text style={styles.processingText}>
              Recording transaction offline
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />

      <View style={styles.amountSection}>
        <Text style={styles.amountText}>${amount}</Text>
      </View>

      <View style={styles.centerContent}>
        {!animationComplete ? (
          <View style={styles.animationContainer}>
            <TouchableOpacity
              onPress={handleNFCTap}
              style={styles.nfcTapArea}
              activeOpacity={0.8}
            >
              <LottieView
                source={require("../../assets/lotties/waiting_animation.json")}
                autoPlay
                loop
                style={styles.waitingAnimation}
              />
              {nfcScanning && (
                <View style={styles.scanningOverlay}>
                  <Text style={styles.scanningText}>
                    Hold your card near the phone...
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.nfcInstructionText}>
              {nfcSupported ? "Tap to pay with NFC card" : "Tap to enter PIN"}
            </Text>
          </View>
        ) : transactionDenied ? (
          <View style={styles.deniedContainer}>
            <View style={styles.deniedIconContainer}>
              <LottieView
                source={require("../../assets/lotties/waiting_animation.json")}
                autoPlay
                loop
                style={styles.deniedAnimation}
              />
            </View>
            <Text style={styles.deniedTitle}>Transaction Denied</Text>
            <Text style={styles.deniedMessage}>
              Insufficient funds in account
            </Text>
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
    backgroundColor: "#F0EC57",
  },
  amountSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  amountText: {
    fontSize: 72,
    fontWeight: "700",
    color: "#000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  waitingAnimation: {
    width: 300,
    height: 300,
  },
  pulseRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "#000",
  },
  centerRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "transparent",
  },
  splash: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#000",
    opacity: 0.1,
  },
  checkmarkContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  deniedContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  deniedIconContainer: {
    marginBottom: 30,
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  deniedAnimation: {
    width: 300,
    height: 300,
  },
  deniedTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FF3B30",
    marginBottom: 16,
    textAlign: "center",
  },
  deniedMessage: {
    fontSize: 18,
    color: "#000",
    textAlign: "center",
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  backButtonText: {
    color: "#F0EC57",
    fontSize: 18,
    fontWeight: "600",
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#F0EC57",
  },
  authContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  authTopSection: {
    alignItems: "center",
    paddingTop: 20,
  },
  authAmountLarge: {
    fontSize: 64,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  authLabel: {
    fontSize: 20,
    fontWeight: "400",
    color: "#000",
    textAlign: "center",
    marginBottom: 40,
  },
  summaryBox: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  summaryItemLeft: {
    flex: 1,
    marginRight: 16,
  },
  summaryItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  summaryItemPercentage: {
    fontSize: 13,
    color: "#666",
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  pinSection: {
    alignItems: "center",
    paddingBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  pinLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
    textAlign: "center",
  },
  pinInputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  pinInput: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    fontSize: 24,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 8,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: "#000",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#F0EC57",
    fontSize: 18,
    fontWeight: "700",
  },
  processingContainer: {
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginTop: 20,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 16,
    color: "#666",
  },
  nfcTapArea: {
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  scanningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 150,
  },
  scanningText: {
    color: "#F0EC57",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  nfcInstructionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 20,
    textAlign: "center",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  summaryTotalAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  confirmationButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  cancelButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#F0EC57",
    fontSize: 18,
    fontWeight: "700",
  },
});
