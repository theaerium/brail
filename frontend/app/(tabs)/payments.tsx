import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/store/authStore";
import LottieView from "lottie-react-native";

export default function PaymentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<"spend" | "receive">("spend");
  const [amount, setAmount] = useState("");
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Play the animation when component mounts
    animationRef.current?.play();
  }, []);

  const handleNumberPress = (num: string) => {
    // Remove commas and decimals for length check
    const cleanAmount = amount.replace(/,/g, "").replace(".", "");

    // Limit to 6 digits before decimal
    if (num !== "." && cleanAmount.length >= 6) return;

    if (num === "." && amount.includes(".")) return; // Only one decimal

    if (num === "." && amount === "") {
      setAmount("0.");
    } else {
      setAmount(amount + num);
    }
  };

  const formatAmount = (value: string) => {
    if (!value || value === "0") return "0";

    // Split by decimal
    const parts = value.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add commas to integer part
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Return with decimal if exists
    return decimalPart !== undefined
      ? `${formatted}.${decimalPart}`
      : formatted;
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleClear = () => {
    setAmount("");
  };

  const handleContinue = () => {
    const cleanAmount = amount.replace(/,/g, "");
    const amountNum = parseFloat(cleanAmount || "0");

    if (amountNum <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0",
      );
      return;
    }

    if (amountNum > 999999) {
      Alert.alert(
        "Amount Too Large",
        "Please enter an amount less than $999,999",
      );
      return;
    }

    router.push({
      pathname: "/payment/accept-payment",
      params: {
        amount: amountNum.toFixed(2),
        merchantId: user!.user_id,
        merchantName: user!.username,
      },
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />

      {/* Header with Back Button and Toggle Buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === "spend" && styles.toggleButtonActive,
            ]}
            onPress={() => setMode("spend")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "spend" && styles.toggleTextActive,
              ]}
            >
              Spend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === "receive" && styles.toggleButtonActive,
            ]}
            onPress={() => setMode("receive")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "receive" && styles.toggleTextActive,
              ]}
            >
              Receive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === "spend" ? (
        <>
          {/* Spend Mode - NFC Waiting */}
          <Text style={styles.instructionText}>
            Hold your phone, card, or item near{"\n"}the terminal you want to
            spend with
          </Text>

          {/* Lottie Animation */}
          <View style={styles.animationContainer}>
            <LottieView
              ref={animationRef}
              source={require("../../assets/lotties/waiting_animation.json")}
              autoPlay
              loop
              style={styles.animation}
            />
          </View>
        </>
      ) : (
        <>
          {/* Receive Mode - Accept Payment */}
          <View style={styles.receiveContent}>
            <Text style={styles.receiveLabel}>Accept payment</Text>

            <View style={styles.amountDisplay}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.amountText}>
                {formatAmount(amount || "0")}
              </Text>
            </View>

            <View style={styles.keypad}>
              <View style={styles.keypadRow}>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("1")}
                >
                  <Text style={styles.keyText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("2")}
                >
                  <Text style={styles.keyText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("3")}
                >
                  <Text style={styles.keyText}>3</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.keypadRow}>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("4")}
                >
                  <Text style={styles.keyText}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("5")}
                >
                  <Text style={styles.keyText}>5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("6")}
                >
                  <Text style={styles.keyText}>6</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.keypadRow}>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("7")}
                >
                  <Text style={styles.keyText}>7</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("8")}
                >
                  <Text style={styles.keyText}>8</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("9")}
                >
                  <Text style={styles.keyText}>9</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.keypadRow}>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress(".")}
                >
                  <Text style={styles.keyText}>.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handleNumberPress("0")}
                >
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
                  style={[
                    styles.continueButton,
                    !amount && styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={!amount}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EC57",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 100,
  },
  backButton: {
    padding: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    justifyContent: "flex-end",
  },
  toggleButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "transparent",
  },
  toggleButtonActive: {
    backgroundColor: "#000",
  },
  toggleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  toggleTextActive: {
    color: "#F0EC57",
  },
  instructionText: {
    fontSize: 18,
    fontStyle: "italic",
    color: "#000",
    textAlign: "center",
    marginBottom: 60,
    lineHeight: 28,
  },
  animationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    width: 300,
    height: 300,
  },
  receiveContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  receiveLabel: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000",
    marginBottom: 30,
    textAlign: "center",
  },
  amountDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  currency: {
    fontSize: 72,
    fontWeight: "300",
    color: "#000",
    marginRight: 4,
  },
  amountText: {
    fontSize: 72,
    fontWeight: "300",
    color: "#000",
  },
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    gap: 40,
    marginBottom: 12,
  },
  key: {
    width: 80,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 36,
    fontWeight: "300",
    color: "#000",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
  },
  continueButton: {
    flex: 2,
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: "#666",
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F0EC57",
  },
});
