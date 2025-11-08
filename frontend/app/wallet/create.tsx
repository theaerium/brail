import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import NFCService from '../../src/services/NFCService';
import { Ionicons } from '@expo/vector-icons';

export default function CreateWallet() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isWriting, setIsWriting] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);

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

  const handleCreateWallet = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsWriting(true);

    try {
      // For wallet cards, we write a simpler structure
      // In production, this would include encrypted user data
      const walletData = {
        item_id: `wallet-${user.user_id}`,
        owner_id: user.user_id,
        category: 'wallet',
        subcategory: 'card',
        brand: 'NFC Trade',
        value: 0,
        is_fractional: false,
        share_percentage: 1.0,
        timestamp: Date.now(),
        signature: await NFCService.generateSignature(
          `wallet-${user.user_id}:${user.username}:${Date.now()}`
        ),
      };

      // Write to NFC card
      await NFCService.writeItemTag(walletData);

      Alert.alert(
        'Success!',
        'Wallet card created successfully! You can now use this card to quickly access your inventory for payments.',
        [
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      console.error('Wallet creation error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create wallet card. Make sure you hold the NFC card close to your device.',
        [
          { text: 'Try Again', onPress: () => setIsWriting(false) },
          { text: 'Cancel', onPress: () => setIsWriting(false) },
        ]
      );
    }

    setIsWriting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Wallet Card</Text>
      </View>

      <View style={styles.content}>
        {!isWriting ? (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="card" size={100} color="#007AFF" />
            </View>

            <Text style={styles.heading}>NFC Wallet Card</Text>
            <Text style={styles.description}>
              Create a wallet card that represents your entire inventory.
              Tap this card during payments to quickly access all your items.
            </Text>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.featureText}>Quick Access</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.featureText}>Secure</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.featureText}>Reusable</Text>
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Instructions:</Text>
              <Text style={styles.instructionsText}>
                1. Get an NFC card (NTAG215 recommended){' \n'}
                2. Tap "Create Wallet Card" button{' \n'}
                3. Hold your phone near the card{' \n'}
                4. Wait for confirmation
              </Text>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateWallet}
              disabled={!nfcSupported}
            >
              <Ionicons name="card" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Wallet Card</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.writingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.writingText}>Hold your phone near the NFC card...</Text>
            <Ionicons name="card" size={100} color="#007AFF" style={{ marginTop: 24 }} />
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
  iconContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
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
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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
});
