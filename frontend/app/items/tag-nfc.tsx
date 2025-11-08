import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useItemStore } from '../../src/store/itemStore';
import NFCService from '../../src/services/NFCService';
import { Ionicons } from '@expo/vector-icons';

export default function TagNFC() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { items } = useItemStore();
  const [isWriting, setIsWriting] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);

  const item = items.find((i) => i.item_id === itemId);

  useEffect(() => {
    checkNFC();
    return () => {
      NFCService.cleanup();
    };
  }, []);

  const checkNFC = async () => {
    const supported = await NFCService.init();
    setNfcSupported(supported);
    if (!supported) {
      Alert.alert(
        'NFC Not Supported',
        'Your device does not support NFC or it is disabled',
        [
          { text: 'OK', onPress: () => router.back() },
        ]
      );
    }
  };

  const handleWriteNFC = async () => {
    if (!item) {
      Alert.alert('Error', 'Item not found');
      return;
    }

    setIsWriting(true);

    try {
      // Generate signature for the item
      const dataToSign = `${item.item_id}:${item.owner_id}:${Date.now()}`;
      const signature = await NFCService.generateSignature(dataToSign);

      // Prepare NFC data
      const nfcData = {
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
        signature,
      };

      // Write to NFC tag
      await NFCService.writeItemTag(nfcData);

      Alert.alert(
        'Success!',
        'Item has been tagged with NFC. You can now use this item for payments.',
        [
          { text: 'Done', onPress: () => router.replace('/(tabs)/inventory') },
        ]
      );
    } catch (error: any) {
      console.error('NFC write error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to write NFC tag. Make sure you hold the tag close to your device.',
        [
          { text: 'Try Again', onPress: () => setIsWriting(false) },
          { text: 'Cancel', onPress: () => setIsWriting(false) },
        ]
      );
    }

    setIsWriting(false);
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Tag with NFC</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.itemPreview}>
          <Image source={{ uri: item.photo }} style={styles.itemImage} />
          <Text style={styles.itemName}>
            {item.brand} {item.subcategory}
          </Text>
          <Text style={styles.itemValue}>${item.value.toFixed(2)}</Text>
        </View>

        {!isWriting ? (
          <>
            <View style={styles.instructions}>
              <Ionicons name="information-circle" size={24} color="#007AFF" />
              <Text style={styles.instructionsTitle}>How to Tag</Text>
              <Text style={styles.instructionsText}>
                1. Place an NFC sticker on your item{' \n'}
                2. Tap "Write to NFC Tag" button{' \n'}
                3. Hold your phone near the sticker{' \n'}
                4. Wait for confirmation
              </Text>
            </View>

            <TouchableOpacity
              style={styles.writeButton}
              onPress={handleWriteNFC}
              disabled={!nfcSupported}
            >
              <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
              <Text style={styles.writeButtonText}>Write to NFC Tag</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.back()}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.writingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.writingText}>Hold your phone near the NFC tag...</Text>
            <Ionicons name="phone-portrait" size={100} color="#007AFF" style={{ marginTop: 24 }} />
            <Text style={styles.writingHint}>Keep steady until complete</Text>
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
  },
  itemPreview: {
    alignItems: 'center',
    marginBottom: 32,
  },
  itemImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  itemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  writeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  writeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  writingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    textAlign: 'center',
  },
  writingHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
