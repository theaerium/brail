import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useItemStore } from '../../src/store/itemStore';
import { Ionicons } from '@expo/vector-icons';

function TagNFC() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { items } = useItemStore();
  const [isWriting, setIsWriting] = useState(false);
  const [nfcReady, setNfcReady] = useState(false);

  const item = items.find((i) => i.item_id === itemId);

  useEffect(() => {
    // Check if NFC is available
    // In Expo Go, NFC is not available, need development build
    setNfcReady(false);
  }, []);

  const handleWriteNFC = async () => {
    setIsWriting(true);

    // Simulate NFC write process
    setTimeout(() => {
      setIsWriting(false);
      Alert.alert(
        'NFC Tag Simulated',
        'In a real device with development build, this would write to your NFC tag.\n\nFor now, your item is ready to use!',
        [
          { text: 'Done', onPress: () => router.replace('/(tabs)/inventory') },
        ]
      );
    }, 2000);
  };

  if (!item) {
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
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Item not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Development Build Required</Text>
                <Text style={styles.infoText}>
                  NFC functionality requires a development build. In Expo Go, we'll simulate the NFC tagging process.
                </Text>
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>How to Tag (Real Device):</Text>
              <Text style={styles.instructionsText}>
                1. Get NTAG215 NFC stickers ($0.25 each){' \n'}
                2. Place sticker on your item's label{' \n'}
                3. Tap "Write to NFC Tag" below{' \n'}
                4. Hold phone near the sticker{' \n'}
                5. Wait for confirmation
              </Text>
            </View>

            <View style={styles.nfcDataBox}>
              <Text style={styles.nfcDataTitle}>Data to be Written:</Text>
              <Text style={styles.nfcDataText}>Item ID: {item.item_id.substring(0, 12)}...</Text>
              <Text style={styles.nfcDataText}>Owner: {item.owner_id.substring(0, 12)}...</Text>
              <Text style={styles.nfcDataText}>Category: {item.category}</Text>
              <Text style={styles.nfcDataText}>Value: ${item.value}</Text>
              <Text style={styles.nfcDataText}>Size: ~150-200 bytes (fits NTAG215)</Text>
            </View>

            <TouchableOpacity
              style={styles.writeButton}
              onPress={handleWriteNFC}
            >
              <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
              <Text style={styles.writeButtonText}>Simulate NFC Write</Text>
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
            <Text style={styles.writingText}>Simulating NFC write...</Text>
            <Ionicons name="phone-portrait" size={100} color="#007AFF" style={{ marginTop: 24 }} />
            <Text style={styles.writingHint}>In real device, hold phone near tag</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    marginBottom: 24,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  nfcDataBox: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nfcDataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  nfcDataText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontFamily: 'monospace',
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
    paddingVertical: 48,
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
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    minWidth: 150,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TagNFC;
