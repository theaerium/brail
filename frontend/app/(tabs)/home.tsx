import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useItemStore } from "../../src/store/itemStore";
import { useTransactionStore } from "../../src/store/transactionStore";
import type {
  Transaction as TransactionType,
  SpentItem,
} from "../../src/store/transactionStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SHIPPING_LABEL_IMAGE = require("../../assets/images/shipping_label.png");

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const { items, fetchItems } = useItemStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingShipmentItems, setPendingShipmentItems] = useState<SpentItem[]>(
    [],
  );
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const lastFetchTimeRef = React.useRef<number>(0);

  const checkPendingShipments = async () => {
    try {
      const storedItems = await AsyncStorage.getItem("pendingShipmentItems");
      if (storedItems) {
        const items = JSON.parse(storedItems);
        console.log("[HomeScreen] Found pending shipment items:", items.length);
        setPendingShipmentItems(items);
      } else {
        setPendingShipmentItems([]);
      }
    } catch (error) {
      console.error("[HomeScreen] Failed to load pending shipments:", error);
    }
  };

  const clearPendingShipments = async () => {
    try {
      await AsyncStorage.removeItem("pendingShipmentItems");
      setPendingShipmentItems([]);
      setShippingModalVisible(false);
      setShowShippingLabel(false);
    } catch (error) {
      console.error("[HomeScreen] Failed to clear pending shipments:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log("[HomeScreen] Screen focused, refreshing data...");
      if (user) {
        console.log("[HomeScreen] Fetching items for user:", user.user_id);
        fetchItems(user.user_id);
        console.log(
          "[HomeScreen] Fetching transactions for user:",
          user.user_id,
        );
        fetchTransactions(user.user_id);
        console.log("[HomeScreen] Refreshing user data...");
        refreshUser();

        // Check for pending shipment items
        checkPendingShipments();
      } else {
        console.log("[HomeScreen] No user found");
      }
    }, [user]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchItems(user.user_id);
      await fetchTransactions(user.user_id);
      await refreshUser();
    }
    setRefreshing(false);
  };

  // Use account balance from user object, fallback to total item value
  const accountBalance =
    user?.balance ?? items.reduce((sum, item) => sum + (item.value || 0), 0);

  // Helper function to format transaction time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Helper function to get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "cube";
      case "payment":
        return "card";
      case "withdrawal":
        return "arrow-down-circle";
      case "refund":
        return "arrow-undo";
      default:
        return "swap-horizontal";
    }
  };

  // Get display name for transaction
  const getTransactionName = (transaction: any) => {
    if (transaction.type === "deposit" && transaction.item_details) {
      return `${transaction.item_details.brand || ""} ${transaction.item_details.subcategory || ""}`.trim();
    }
    if (transaction.type === "payment" && transaction.merchant_name) {
      return transaction.merchant_name;
    }
    return transaction.description || transaction.type;
  };

  const formatFraction = (value: number) => {
    if (value >= 0.999) return "full";
    const denominators = [2, 3, 4, 5, 6, 8];
    let best = { diff: Number.MAX_VALUE, num: 0, den: 1 };
    denominators.forEach((den) => {
      const num = Math.round(value * den);
      if (num === 0) return;
      const diff = Math.abs(value - num / den);
      if (diff < best.diff) {
        best = { diff, num, den };
      }
    });
    return `${best.num}/${best.den}`;
  };

  const getSpentSummary = (transaction: TransactionType) => {
    if (!transaction.spent_items || transaction.spent_items.length === 0) {
      return null;
    }
    return transaction.spent_items
      .map((item) => {
        if (item.fraction >= 0.999) {
          return item.label || "item";
        }
        return `${formatFraction(item.fraction)} of ${item.label || "item"}`;
      })
      .join(", ");
  };

  // Take only the most recent 5 transactions for home screen
  const recentTransactions = transactions.slice(0, 5);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            colors={["#000"]}
          />
        }
      >
        {/* Yellow Header Section */}
        <View style={styles.yellowHeader}>
          <SafeAreaView edges={["top"]}>
            {/* Top Bar with Avatar and Menu */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => router.push("/profile")}
              >
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#999" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuButton}>
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </TouchableOpacity>
            </View>

            {/* Balance Label */}
            <View style={styles.balanceLabelContainer}>
              <View style={styles.balancePill}>
                <Text style={styles.balancePillText}>Balance</Text>
              </View>
            </View>

            {/* Balance Amount */}
            <View style={styles.balanceAmountContainer}>
              <Text style={styles.balanceAmount}>
                ${accountBalance.toFixed(2)}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/deposit/capture")}
          >
            <View style={styles.actionIconContainer}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="add" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Deposit</Text>
            </View>
            <Text style={styles.actionDescription}>
              Add items to fund your account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/payments")}
          >
            <View style={styles.actionIconContainer}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="arrow-up-outline" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Send</Text>
            </View>
            <Text style={styles.actionDescription}>Send money to a friend</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsSectionHeader}>
            <Text style={styles.transactionsTitle}>Transactions</Text>
            {transactions.length > 5 && (
              <TouchableOpacity
                onPress={() => router.push("/transactions/list")}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color="#CCC" />
              <Text style={styles.emptyTransactionsText}>
                No transactions yet
              </Text>
              <Text style={styles.emptyTransactionsSubtext}>
                Start by depositing your first item
              </Text>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.transaction_id}
                style={styles.transactionItem}
                onPress={() =>
                  transaction.item_id
                    ? router.push(`/items/${transaction.item_id}`)
                    : router.push("/transactions/list")
                }
              >
                {/* Icon */}
                <View style={styles.transactionIconContainer}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type) as any}
                      size={20}
                      color="#000"
                    />
                  </View>
                </View>

                {/* Details */}
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionName}>
                    {getTransactionName(transaction)}
                  </Text>
                  <View style={styles.transactionStatusContainer}>
                    <Text style={styles.transactionStatus}>
                      {transaction.status}
                    </Text>
                    <Text style={styles.transactionDot}> • </Text>
                    <Text style={styles.transactionTime}>
                      {formatTime(transaction.created_at)}
                    </Text>
                  </View>
                  {transaction.spent_items?.length ? (
                    <Text style={styles.transactionSpentText}>
                      Spent: {getSpentSummary(transaction)}
                    </Text>
                  ) : null}
                </View>

                {/* Amount */}
                <Text style={styles.transactionAmount}>
                  {transaction.type === "deposit" ||
                  transaction.type === "refund"
                    ? "+"
                    : "-"}
                  ${transaction.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Ship Items Notification Banner */}
      {pendingShipmentItems.length > 0 && (
        <TouchableOpacity
          style={styles.shipItemsBanner}
          onPress={() => setShippingModalVisible(true)}
        >
          <View style={styles.shipItemsContent}>
            <Ionicons name="cube" size={20} color="#F0EC57" />
            <Text style={styles.shipItemsText}>
              {pendingShipmentItems.length} item
              {pendingShipmentItems.length > 1 ? "s" : ""} need shipping
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#F0EC57" />
        </TouchableOpacity>
      )}

      {/* Shipping Modal */}
      <Modal
        visible={shippingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShippingModalVisible(false);
          setShowShippingLabel(false);
        }}
      >
        <View style={styles.shippingModalOverlay}>
          <View style={styles.shippingModalCard}>
            <Text style={styles.shippingModalTitle}>Items to ship</Text>
            <Text style={styles.shippingModalSubtitle}>
              Send the items you just spent so we can deliver them to the
              merchant.
            </Text>

            <ScrollView style={{ maxHeight: 220 }}>
              {pendingShipmentItems.map((item) => (
                <View key={item.item_id} style={styles.shippingItemRow}>
                  <Ionicons name="cube-outline" size={18} color="#000" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shippingItemLabel}>{item.label}</Text>
                    <Text style={styles.shippingItemMeta}>
                      {item.fraction >= 0.999
                        ? "Full item"
                        : `${formatFraction(item.fraction)} used`}{" "}
                      · ${item.amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.shippingLabelButton}
              onPress={() => setShowShippingLabel((prev) => !prev)}
            >
              <Text style={styles.shippingLabelButtonText}>
                {showShippingLabel
                  ? "Hide shipping label"
                  : "View shipping label"}
              </Text>
            </TouchableOpacity>

            {showShippingLabel && (
              <Image
                source={SHIPPING_LABEL_IMAGE}
                style={styles.shippingLabelImage}
                resizeMode="contain"
              />
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={clearPendingShipments}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  yellowHeader: {
    backgroundColor: "#F0EC57",
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    padding: 8,
    gap: 5,
  },
  menuLine: {
    width: 30,
    height: 3,
    backgroundColor: "#000",
    borderRadius: 2,
  },
  balanceLabelContainer: {
    marginBottom: 16,
  },
  balancePill: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: "flex-start",
  },
  balancePillText: {
    color: "#F0EC57",
    fontSize: 16,
    fontWeight: "600",
  },
  balanceAmountContainer: {
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 96,
    fontFamily: "GiveYouGlory",
    color: "#000",
    letterSpacing: 2,
  },
  underline: {
    height: 3,
    backgroundColor: "#FFF",
    marginTop: -8,
    marginLeft: 2,
    borderRadius: 1.5,
  },
  actionsContainer: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFF",
    padding: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D0D0D0",
    minHeight: 140,
  },
  actionIconContainer: {
    alignItems: "flex-start",
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  actionDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  transactionsSection: {
    backgroundColor: "#FFF",
    marginTop: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  transactionsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  transactionsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTransactionsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptyTransactionsSubtext: {
    fontSize: 14,
    color: "#CCC",
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  transactionIconContainer: {
    marginRight: 16,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionEmoji: {
    fontSize: 32,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  transactionStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionStatus: {
    fontSize: 13,
    color: "#999",
  },
  transactionDot: {
    fontSize: 13,
    color: "#999",
  },
  transactionTime: {
    fontSize: 13,
    color: "#999",
  },
  transactionSpentText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  shipItemsBanner: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  shipItemsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shipItemsText: {
    color: "#F0EC57",
    fontSize: 16,
    fontWeight: "600",
  },
  shippingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  shippingModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  shippingModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  shippingModalSubtitle: {
    color: "#555",
    marginBottom: 16,
  },
  shippingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  shippingItemLabel: {
    fontWeight: "600",
    color: "#111",
  },
  shippingItemMeta: {
    color: "#555",
    fontSize: 13,
  },
  shippingLabelButton: {
    marginTop: 8,
    backgroundColor: "#000",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  shippingLabelButtonText: {
    color: "#F0EC57",
    fontWeight: "600",
  },
  shippingLabelImage: {
    width: "100%",
    height: 260,
    marginTop: 16,
    borderRadius: 12,
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#F0EC57",
    fontSize: 16,
    fontWeight: "600",
  },
});
