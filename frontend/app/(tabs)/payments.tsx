import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/store/authStore";
import { useItemStore } from "../../src/store/itemStore";
import { useTransactionStore } from "../../src/store/transactionStore";
import UserService from "../../src/services/UserService";
import LottieView from "lottie-react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";

export default function PaymentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transferRecipient?: string }>();
  const { user } = useAuthStore();
  const { items, fetchItems, updateItem } = useItemStore();
  const { createTransaction } = useTransactionStore();

  const [mode, setMode] = useState<"spend" | "receive">("spend");
  const [spendMode, setSpendMode] = useState<"nfc" | "account">("nfc");
  const [receiveMode, setReceiveMode] = useState<"amount" | "account">(
    "amount",
  );
  const [amount, setAmount] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const animationRef = useRef<LottieView>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.user_id) {
        fetchItems(user.user_id);
      }
    }, [user?.user_id, fetchItems]),
  );

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  useEffect(() => {
    if (params.transferRecipient) {
      setMode("spend");
      setSpendMode("account");
      setRecipientUsername(params.transferRecipient as string);
    }
  }, [params.transferRecipient]);

  const selectedItem = useMemo(
    () => items.find((item) => item.item_id === selectedItemId),
    [items, selectedItemId],
  );

  const transferLink = useMemo(() => {
    if (!user) return "";
    const username = encodeURIComponent(user.username);
    return `frontend://(tabs)/payments?transferRecipient=${username}`;
  }, [user]);

  const qrCodeUri = useMemo(() => {
    if (!transferLink) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(transferLink)}`;
  }, [transferLink]);

  const handleNumberPress = (num: string) => {
    const cleanAmount = amount.replace(/,/g, "").replace(".", "");

    if (num !== "." && cleanAmount.length >= 6) return;
    if (num === "." && amount.includes(".")) return;

    if (num === "." && amount === "") {
      setAmount("0.");
    } else {
      setAmount(amount + num);
    }
  };

  const formatAmount = (value: string) => {
    if (!value || value === "0") return "0";

    const parts = value.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1];

    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

  const handleCopyTransferLink = async () => {
    if (!transferLink) return;
    await Clipboard.setStringAsync(transferLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleAccountTransfer = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to send an item");
      return;
    }

    if (!recipientUsername.trim()) {
      Alert.alert(
        "Missing Username",
        "Enter the receiver's username to continue",
      );
      return;
    }

    if (!selectedItem) {
      Alert.alert("Select an Item", "Choose which item you want to transfer");
      return;
    }

    try {
      setTransferLoading(true);
      const receiver = await UserService.findByUsername(
        recipientUsername.trim(),
      );

      await updateItem(selectedItem.item_id, { owner_id: receiver.user_id });

      await createTransaction({
        user_id: user.user_id,
        type: "transfer",
        amount: selectedItem.value,
        item_id: selectedItem.item_id,
        item_details: {
          brand: selectedItem.brand,
          subcategory: selectedItem.subcategory,
          category: selectedItem.category,
          condition: selectedItem.condition,
        },
        merchant_name: `@${receiver.username}`,
        description: `Sent ${selectedItem.brand} ${selectedItem.subcategory} to @${receiver.username}`,
        status: "completed",
      });

      await createTransaction(
        {
          user_id: receiver.user_id,
          type: "deposit",
          amount: selectedItem.value,
          item_id: selectedItem.item_id,
          item_details: {
            brand: selectedItem.brand,
            subcategory: selectedItem.subcategory,
            category: selectedItem.category,
            condition: selectedItem.condition,
          },
          merchant_name: `@${user.username}`,
          description: `Received ${selectedItem.brand} ${selectedItem.subcategory} from @${user.username}`,
          status: "completed",
        },
        { silent: true },
      );

      Alert.alert(
        "Transfer Complete",
        `${selectedItem.brand} ${selectedItem.subcategory} now belongs to @${receiver.username}`,
      );
      setRecipientUsername("");
      setSelectedItemId("");
    } catch (error: any) {
      console.error("Account transfer failed", error);
      Alert.alert(
        "Transfer Failed",
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to move the item. Please try again.",
      );
    } finally {
      setTransferLoading(false);
    }
  };

  const renderSpendContent = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.instructionText}>
        Hold your phone, card, or item near{"\n"}the terminal you want to spend
        with
      </Text>
      <View style={styles.animationContainer}>
        <LottieView
          ref={animationRef}
          source={require("../../assets/lotties/waiting_animation.json")}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    </View>
  );

  const renderSpendContentOld = () => (
    <View style={styles.modeContainer}>
      {false ? (
        <>
          <Text style={styles.instructionText}>
            Hold your phone, card, or item near{"\n"}the terminal you want to
            spend with
          </Text>
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
        <ScrollView
          style={styles.transferScroll}
          contentContainerStyle={styles.transferContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.transferHeader}>Send an item directly</Text>
          <TextInput
            style={styles.input}
            placeholder="Receiver username"
            placeholderTextColor="#555"
            value={recipientUsername}
            onChangeText={setRecipientUsername}
            autoCapitalize="none"
          />
          <Text style={styles.transferHint}>
            Select the item you want to move
          </Text>
          {items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="cube" size={28} color="#666" />
              <Text style={styles.emptyItemsText}>No items yet</Text>
              <Text style={styles.emptyItemsSubtext}>
                Deposit an item to enable transfers
              </Text>
            </View>
          ) : (
            <View style={styles.itemGrid}>
              {items.map((item) => {
                const isSelected = selectedItemId === item.item_id;
                return (
                  <TouchableOpacity
                    key={item.item_id}
                    style={[
                      styles.itemCard,
                      isSelected && styles.itemCardSelected,
                    ]}
                    onPress={() =>
                      setSelectedItemId((prev) =>
                        prev === item.item_id ? "" : item.item_id,
                      )
                    }
                  >
                    <Text style={styles.itemBrand}>{item.brand}</Text>
                    <Text style={styles.itemSubcategory}>
                      {item.subcategory}
                    </Text>
                    <Text style={styles.itemValue}>
                      ${item.value.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.transferButton,
              (!selectedItem || transferLoading) &&
                styles.transferButtonDisabled,
            ]}
            onPress={handleAccountTransfer}
            disabled={!selectedItem || transferLoading}
          >
            {transferLoading ? (
              <ActivityIndicator color="#F0EC57" />
            ) : (
              <Text style={styles.transferButtonText}>Send Item</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  const renderReceiveContent = () => (
    <View style={styles.modeContainer}>
      {true ? (
        <View style={styles.receiveContent}>
          <Text style={styles.receiveLabel}>Accept payment</Text>

          <View style={styles.amountDisplay}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.amountText}>{formatAmount(amount || "0")}</Text>
          </View>

          <View style={styles.keypad}>
            {["123", "456", "789", ".0←"].map((row) => (
              <View key={row} style={styles.keypadRow}>
                {row.split("").map((char) =>
                  char === "←" ? (
                    <TouchableOpacity
                      key={char}
                      style={styles.key}
                      onPress={handleDelete}
                    >
                      <Ionicons
                        name="backspace-outline"
                        size={28}
                        color="#000"
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      key={char}
                      style={styles.key}
                      onPress={() => handleNumberPress(char)}
                    >
                      <Text style={styles.keyText}>{char}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ))}

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
      ) : (
        <ScrollView contentContainerStyle={styles.receiveTransferContent}>
          <Text style={styles.receiveLabel}>
            Share this to receive items instantly
          </Text>
          {qrCodeUri ? (
            <>
              <Image source={{ uri: qrCodeUri }} style={styles.qrCode} />
              <Text style={styles.receiveHint}>
                Scan to open the transfer tab with your username filled in
              </Text>
              <TouchableOpacity
                style={styles.copyLinkButton}
                onPress={handleCopyTransferLink}
              >
                <Ionicons
                  name={linkCopied ? "checkmark" : "copy"}
                  size={18}
                  color="#000"
                />
                <Text style={styles.copyLinkText}>
                  {linkCopied ? "Link copied" : "Copy link"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openLinkButton}
                onPress={() => transferLink && Linking.openURL(transferLink)}
              >
                <Text style={styles.openLinkText}>{transferLink}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyQr}>
              <Ionicons name="qr-code" size={48} color="#999" />
              <Text style={styles.emptyQrText}>
                Sign in to generate your QR code
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0EC57" />

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

      {mode === "spend" ? renderSpendContent() : renderReceiveContent()}
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
    marginBottom: 40,
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
  modeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  subToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 24,
  },
  subToggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  subToggleButtonActive: {
    backgroundColor: "#000",
  },
  subToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  subToggleTextActive: {
    color: "#F0EC57",
  },
  transferScroll: {
    flex: 1,
  },
  transferContent: {
    paddingBottom: 40,
  },
  transferHeader: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#000",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: "#000",
  },
  transferHint: {
    fontSize: 14,
    color: "#444",
    marginBottom: 12,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  itemCard: {
    width: "48%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  itemCardSelected: {
    backgroundColor: "#000",
  },
  itemBrand: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  itemSubcategory: {
    fontSize: 13,
    color: "#444",
    marginVertical: 4,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  transferButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#000",
    alignItems: "center",
  },
  transferButtonDisabled: {
    backgroundColor: "#444",
  },
  transferButtonText: {
    color: "#F0EC57",
    fontWeight: "700",
    fontSize: 18,
  },
  receiveContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  receiveLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
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
  receiveTransferContent: {
    alignItems: "center",
    paddingBottom: 40,
  },
  qrCode: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  receiveHint: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    marginBottom: 16,
  },
  copyLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 12,
  },
  copyLinkText: {
    fontWeight: "600",
    color: "#000",
  },
  openLinkButton: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  openLinkText: {
    color: "#F0EC57",
    fontWeight: "600",
  },
  emptyItems: {
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  emptyItemsText: {
    fontWeight: "700",
    fontSize: 16,
    marginTop: 8,
  },
  emptyItemsSubtext: {
    color: "#444",
    fontSize: 13,
  },
  emptyQr: {
    padding: 32,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  emptyQrText: {
    marginTop: 12,
    color: "#555",
  },
});
