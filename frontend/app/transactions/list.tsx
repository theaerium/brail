import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useTransactionStore } from "../../src/store/transactionStore";
import type { Transaction as TransactionType } from "../../src/store/transactionStore";

export default function TransactionsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "deposit">("all");

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTransactions(user.user_id);
      }
    }, [user]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchTransactions(user.user_id);
    }
    setRefreshing(false);
  };

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === "deposit");

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return { name: "cube" as const, color: "#007AFF", bg: "#E5F1FF" };
      case "payment":
        return { name: "card" as const, color: "#FF3B30", bg: "#FFE5E5" };
      case "withdrawal":
        return {
          name: "arrow-down-circle" as const,
          color: "#FF9500",
          bg: "#FFF3E5",
        };
      case "refund":
        return { name: "arrow-undo" as const, color: "#34C759", bg: "#E5F9E9" };
      default:
        return {
          name: "swap-horizontal" as const,
          color: "#8E8E93",
          bg: "#F2F2F7",
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
      .map((item) =>
        item.fraction >= 0.999
          ? item.label || "item"
          : `${formatFraction(item.fraction)} of ${item.label || "item"}`,
      )
      .join(", ");
  };

  const renderTransaction = ({ item }: any) => {
    const icon = getTransactionIcon(item.type);
    const isPositive = item.type === "deposit" || item.type === "refund";

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => item.item_id && router.push(`/items/${item.item_id}`)}
      >
        <View style={[styles.transactionIcon, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {item.type === "deposit" && item.item_details
              ? `${item.item_details.brand || ""} ${item.item_details.subcategory || ""}`
              : item.type === "payment" && item.merchant_name
                ? item.merchant_name
                : item.description ||
                  `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.created_at)}
          </Text>
          {item.spent_items?.length ? (
            <Text style={styles.transactionSpent}>
              Spent: {getSpentSummary(item)}
            </Text>
          ) : null}
          {item.item_details?.category && (
            <Text style={styles.transactionCategory}>
              {item.item_details.category}
            </Text>
          )}
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isPositive ? "#34C759" : "#FF3B30" },
            ]}
          >
            {isPositive ? "+" : "-"}${item.amount?.toFixed(2)}
          </Text>
          {item.item_details?.condition && (
            <Text style={styles.transactionCondition}>
              {item.item_details.condition}
            </Text>
          )}
          {item.status && (
            <Text style={styles.transactionStatus}>{item.status}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            All Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "deposit" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("deposit")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "deposit" && styles.filterTabTextActive,
            ]}
          >
            Deposits Only
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.transaction_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by depositing your first item
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabs: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#007AFF",
  },
  filterTabText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  list: {
    padding: 20,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5F1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 2,
  },
  transactionSpent: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: "#C7C7CC",
    textTransform: "capitalize",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34C759",
    marginBottom: 4,
  },
  transactionCondition: {
    fontSize: 12,
    color: "#8E8E93",
    textTransform: "capitalize",
  },
  transactionStatus: {
    fontSize: 11,
    color: "#C7C7CC",
    textTransform: "capitalize",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 8,
    textAlign: "center",
  },
});
