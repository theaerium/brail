import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TagNFCDeposit() {
  const router = useRouter();
  const { itemId, itemName, itemValue, photo } = useLocalSearchParams<{
    itemId: string;
    itemName: string;
    itemValue: string;
    photo: string;
  }>();
  const [isWriting, setIsWriting] = useState(false);

  const handleWriteNFC = async () => {
    setIsWriting(true);

    // Simulate NFC write process (2 seconds)
    setTimeout(() => {
      setIsWriting(false);
      Alert.alert(
        'NFC Tag Simulated!',
        'In a real device with development build, this would write to your NFC tag.\n\nYour item is tagged and ready to use!',
        [
          { text: 'Done', onPress: () => router.replace('/(tabs)/home') },
        ]
      );
    }, 2000);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip NFC Tagging?',
      'You can tag this item with NFC later from your inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => router.replace('/(tabs)/home') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
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
          {/* Success Banner */}
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>Item Deposited!</Text>
            <Text style={styles.successText}>
              ${itemValue} added to your balance
            </Text>
          </View>

          {/* Item Preview */}
          <View style={styles.itemPreview}>
            {photo && (
              <Image source={{ uri: photo }} style={styles.itemImage} />
            )}
            <Text style={styles.itemName}>{itemName}</Text>
            <Text style={styles.itemValue}>${parseFloat(itemValue).toFixed(2)}</Text>
          </View>

          {!isWriting ? (
            <>
              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Tag Your Item</Text>
                  <Text style={styles.infoText}>
                    Assign this item to an NFC tag for quick tap-to-pay transactions. You can skip this step and tag it later.
                  </Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.instructionsTitle}>How to Tag:</Text>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Get NTAG215 NFC stickers (Amazon, $0.25 each)
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Place sticker on your item or its packaging
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Tap "Write to NFC Tag" below
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>
                    Hold your phone near the sticker
                  </Text>
                </View>
              </View>

              {/* Development Build Warning */}
              <View style={styles.warningBox}>
                <Ionicons name="code-slash" size={20} color="#856404" />
                <Text style={styles.warningText}>
                  <Text style={styles.warningBold}>Development Build Required:</Text> NFC functionality requires a development build. In Expo Go, we'll simulate the tagging process.
                </Text>
              </View>

              {/* NFC Data Preview */}
              <View style={styles.nfcDataBox}>
                <Text style={styles.nfcDataTitle}>Data to be Written:</Text>
                <View style={styles.dataRow}>
                  <Ionicons name="pricetag" size={16} color="#666" />
                  <Text style={styles.nfcDataText}>Item: {itemName}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Ionicons name="cash" size={16} color="#666" />
                  <Text style={styles.nfcDataText}>Value: ${itemValue}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Ionicons name="key" size={16} color="#666" />
                  <Text style={styles.nfcDataText}>ID: {itemId?.substring(0, 12)}...</Text>
                </View>
                <View style={styles.dataRow}>
                  <Ionicons name="resize" size={16} color="#666" />
                  <Text style={styles.nfcDataText}>Size: ~150 bytes (fits NTAG215)</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.writeButton}
                onPress={handleWriteNFC}
              >
                <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                <Text style={styles.writeButtonText}>Write to NFC Tag</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.writingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.writingText}>Writing to NFC tag...</Text>
              <View style={styles.nfcAnimation}>
                <Ionicons name="phone-portrait" size={100} color="#007AFF" />
                <View style={styles.nfcWaves}>
                  <View style={[styles.wave, styles.wave1]} />
                  <View style={[styles.wave, styles.wave2]} />
                  <View style={[styles.wave, styles.wave3]} />
                </View>
              </View>
              <Text style={styles.writingHint}>Hold your phone near the NFC tag</Text>
              <Text style={styles.writingSubhint}>Keep it steady until confirmation</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
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
    padding: 20,
  },
  successBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
  },
  itemPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  itemValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E5F1FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#005A9E',
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    paddingTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  warningBold: {
    fontWeight: 'bold',
  },
  nfcDataBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nfcDataTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nfcDataText: {
    fontSize: 14,
    color: '#666',
  },
  writeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  writeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 20,
  },
  writingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
    textAlign: 'center',
  },
  nfcAnimation: {
    position: 'relative',
    marginVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcWaves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.3,
  },
  wave1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.2,
  },
  wave2: {
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.1,
  },
  wave3: {
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.05,
  },
  writingHint: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  writingSubhint: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
