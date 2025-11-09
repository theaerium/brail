import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useItemStore } from '../../src/store/itemStore';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AnalysisResult {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  estimated_value: number;
  condition: string;
}

export default function ConfirmDeposit() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { addItem } = useItemStore();
  const [photo] = useState(params.photo as string);
  const [analyzing, setAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeItem();
  }, []);

  const analyzeItem = async () => {
    if (!photo) {
      Alert.alert('Error', 'No photo provided');
      router.back();
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/items/analyze-deposit`,
        { image_base64: photo },
        { timeout: 60000 } // 60 second timeout
      );

      setAnalysis(response.data);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to analyze item. Please try again.';
      setError(errorMessage);
      Alert.alert(
        'Analysis Failed',
        errorMessage,
        [
          { text: 'Try Again', onPress: () => router.back() },
          { text: 'Add Manually', onPress: () => router.replace('/items/add') },
        ]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeposit = async () => {
    if (!analysis || !user) return;

    setDepositing(true);

    try {
      const item = await addItem({
        owner_id: user.user_id,
        category: analysis.category,
        subcategory: analysis.subcategory,
        brand: analysis.brand,
        condition: analysis.condition,
        photo,
        value: analysis.estimated_value,
        is_fractional: false,
        share_percentage: 1.0,
      });

      Alert.alert(
        'Success!',
        `${analysis.name} deposited successfully! Would you like to tag it with NFC?`,
        [
          {
            text: 'Tag Now',
            onPress: () => router.replace(`/items/tag-nfc?itemId=${item.item_id}`),
          },
          {
            text: 'Done',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]
      );
    } catch (err) {
      console.error('Deposit failed:', err);
      Alert.alert('Error', 'Failed to deposit item. Please try again.');
    } finally {
      setDepositing(false);
    }
  };

  const handleRetake = () => {
    router.back();
  };

  if (analyzing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing item with AI...</Text>
        <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        <Ionicons name="sparkles" size={40} color="#007AFF" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (error || !analysis) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={80} color="#FF3B30" />
        <Text style={styles.errorText}>Analysis Failed</Text>
        <Text style={styles.errorSubtext}>{error || 'Unknown error occurred'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Deposit</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.photoSection}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={handleRetake}
            >
              <Ionicons name="camera" size={16} color="#007AFF" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.analysisSection}>
            <View style={styles.aiLabel}>
              <Ionicons name="sparkles" size={16} color="#007AFF" />
              <Text style={styles.aiLabelText}>AI Analysis</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.itemName}>{analysis.name}</Text>
              
              <View style={styles.detailRow}>
                <Ionicons name="pricetag" size={20} color="#666" />
                <Text style={styles.detailText}>
                  {analysis.brand} • {analysis.category}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="star" size={20} color="#666" />
                <Text style={styles.detailText}>
                  Condition: {analysis.condition.charAt(0).toUpperCase() + analysis.condition.slice(1)}
                </Text>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>{analysis.description}</Text>
              </View>

              <View style={styles.valueContainer}>
                <Text style={styles.valueLabel}>Estimated Value</Text>
                <Text style={styles.valueAmount}>${analysis.estimated_value.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                AI has analyzed your item. Review the details and adjust if needed before depositing.
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={handleRetake}
            >
              <Text style={styles.retakeButtonText}>Retake Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.depositButton}
              onPress={handleDeposit}
              disabled={depositing}
            >
              {depositing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.depositButtonText}>Deposit Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 24,
  },
  photoSection: {
    marginBottom: 24,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  analysisSection: {
    marginBottom: 24,
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  aiLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  detailCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  valueLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  valueAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  depositButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  depositButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});