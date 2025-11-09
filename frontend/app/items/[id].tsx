import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useItemStore } from "../../src/store/itemStore";
import NFCService, { ItemNFCData } from "../../src/services/NFCService";
import { isNFCAvailable } from "../../src/services/NFCManager";

export default function ItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useItemStore();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  const item = items.find((i) => i.item_id === id);

  useEffect(() => {
    checkNFCSupport();
  }, []);

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

  const handleCheckTag = async () => {
    if (!nfcSupported || !isNFCAvailable) {
      Alert.alert(
        "NFC Not Available",
        "NFC functionality requires a development build on a device with NFC support.",
      );
      return;
    }

    setIsScanning(true);
    try {
      const tagData = await NFCService.readItemTag();

      setIsScanning(false);

      // Compare shortened UUIDs (first 12 chars without dashes)
      const shortenUUID = (uuid: string) =>
        uuid.replace(/-/g, "").substring(0, 12);
      const tagItemId = shortenUUID(tagData.item_id);
      const currentItemId = shortenUUID(item?.item_id || "");

      if (tagItemId === currentItemId) {
        Alert.alert(
          "✓ Tag Verified!",
          `This tag matches your item:\n\n${item.brand} ${item.subcategory}\n\nValue: $${item.value.toFixed(2)}\nCondition: ${item.condition}\n\nTag ID: ${tagItemId}`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Tag Mismatch",
          `This tag does not match this item.\n\nTag ID: ${tagItemId}\nExpected: ${currentItemId}\n\nIt may belong to a different item.`,
          [{ text: "OK" }],
        );
      }
    } catch (error: any) {
      setIsScanning(false);
      console.error("NFC read failed:", error);
      Alert.alert(
        "Read Failed",
        error.message ||
          "Failed to read NFC tag. Make sure you're holding your phone near the tag.",
        [{ text: "OK" }],
      );
    }
  };

  const handleTagItem = async () => {
    if (!item) return;

    if (!nfcSupported || !isNFCAvailable) {
      Alert.alert(
        "NFC Not Available",
        "NFC functionality requires a development build on a device with NFC support. You can still view your item details.",
      );
      return;
    }

    Alert.alert(
      "Tag This Item",
      "This will write the item information to an NFC tag. Make sure you have an NTAG215 sticker ready.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Write Tag",
          onPress: async () => {
            setIsWriting(true);
            try {
              const nfcData: ItemNFCData = {
                item_id: item.item_id,
                owner_id: item.owner_id,
                category: item.category,
                subcategory: item.subcategory,
                brand: item.brand,
                value: item.value,
                is_fractional: item.is_fractional,
                share_percentage: item.share_percentage,
                parent_item_id: item.parent_item_id,
                timestamp: Date.now(),
                signature: await NFCService.generateSignature(
                  `${item.item_id}${item.owner_id}${Date.now()}`,
                ),
              };

              await NFCService.writeItemTag(nfcData);

              setIsWriting(false);
              Alert.alert(
                "Success!",
                "Your item has been tagged with NFC. You can now scan it anytime to verify.",
                [{ text: "OK" }],
              );
            } catch (error: any) {
              setIsWriting(false);
              console.error("NFC write failed:", error);
              Alert.alert(
                "Write Failed",
                error.message || "Failed to write NFC tag. Please try again.",
                [{ text: "Retry", onPress: handleTagItem }, { text: "Cancel" }],
              );
            }
          },
        },
      ],
    );
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Item not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isScanning || isWriting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsScanning(false);
              setIsWriting(false);
              NFCService.cancelNFC();
            }}
          >
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isScanning ? "Scanning Tag..." : "Writing Tag..."}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Ionicons
            name="phone-portrait"
            size={120}
            color="#007AFF"
            style={{ marginTop: 32 }}
          />
          <Text style={styles.scanningText}>
            {isScanning
              ? "Hold your phone near the NFC tag"
              : "Writing to NFC tag..."}
          </Text>
          <Text style={styles.scanningHint}>
            {isScanning
              ? "The tag will be read automatically"
              : "Keep your phone near the tag"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Item Image */}
          <Image source={{ uri: item.photo }} style={styles.itemImage} />

          {/* Item Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.itemName}>
              {item.brand} {item.subcategory}
            </Text>
            <Text style={styles.itemValue}>${item.value.toFixed(2)}</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{item.category}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>{item.condition}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Subcategory</Text>
                <Text style={styles.detailValue}>{item.subcategory}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Added</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* NFC Status */}
          {nfcSupported ? (
            <View
              style={[styles.nfcStatusCard, { backgroundColor: "#E5F9E9" }]}
            >
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <View style={styles.nfcStatusContent}>
                <Text style={[styles.nfcStatusTitle, { color: "#1F7A1F" }]}>
                  NFC Available
                </Text>
                <Text style={[styles.nfcStatusText, { color: "#1F7A1F" }]}>
                  You can write or read NFC tags with this device
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.nfcStatusCard}>
              <Ionicons name="information-circle" size={24} color="#FF9500" />
              <View style={styles.nfcStatusContent}>
                <Text style={styles.nfcStatusTitle}>NFC Not Available</Text>
                <Text style={styles.nfcStatusText}>
                  NFC requires a development build on a compatible device
                </Text>
              </View>
            </View>
          )}

          {/* NFC Action Buttons */}
          <View style={styles.nfcActions}>
            <TouchableOpacity
              style={[
                styles.nfcActionButton,
                !nfcSupported && styles.nfcActionButtonDisabled,
              ]}
              onPress={handleCheckTag}
              disabled={!nfcSupported}
            >
              <Ionicons
                name="scan-outline"
                size={24}
                color={nfcSupported ? "#007AFF" : "#CCC"}
              />
              <Text
                style={[
                  styles.nfcActionText,
                  !nfcSupported && styles.nfcActionTextDisabled,
                ]}
              >
                Check Tag
              </Text>
              <Text
                style={[
                  styles.nfcActionSubtext,
                  !nfcSupported && styles.nfcActionTextDisabled,
                ]}
              >
                Scan existing NFC tag
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nfcActionButton,
                !nfcSupported && styles.nfcActionButtonDisabled,
              ]}
              onPress={handleTagItem}
              disabled={!nfcSupported}
            >
              <Ionicons
                name="pricetag-outline"
                size={24}
                color={nfcSupported ? "#007AFF" : "#CCC"}
              />
              <Text
                style={[
                  styles.nfcActionText,
                  !nfcSupported && styles.nfcActionTextDisabled,
                ]}
              >
                Write Tag
              </Text>
              <Text
                style={[
                  styles.nfcActionSubtext,
                  !nfcSupported && styles.nfcActionTextDisabled,
                ]}
              >
                Tag this item
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>About NFC Tags</Text>
            <Text style={styles.instructionsText}>
              • Use NTAG215 NFC stickers ($0.25 each){"\n"}• Attach the sticker
              to your item's label{"\n"}• Write once, scan anytime to verify
              authenticity{"\n"}• Tags help prevent fraud and make
              authentication instant
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: "#E5E5EA",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  itemValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: "45%",
  },
  detailLabel: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    textTransform: "capitalize",
  },
  nfcStatusCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  nfcStatusContent: {
    flex: 1,
  },
  nfcStatusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 4,
  },
  nfcStatusText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
  nfcActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  nfcActionButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nfcActionButtonDisabled: {
    borderColor: "#E5E5EA",
    backgroundColor: "#F9F9F9",
  },
  nfcActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 12,
  },
  nfcActionSubtext: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
    textAlign: "center",
  },
  nfcActionTextDisabled: {
    color: "#C7C7CC",
  },
  instructionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 22,
  },
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  scanningText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginTop: 32,
    textAlign: "center",
  },
  scanningHint: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 12,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FF3B30",
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
