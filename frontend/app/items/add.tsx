import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useItemStore } from '../../src/store/itemStore';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = [
  { label: 'Clothing', value: 'clothing', subcategories: ['shirt', 'pants', 'jacket', 'shorts'] },
  { label: 'Shoes', value: 'shoes', subcategories: ['sneakers', 'boots', 'sandals'] },
  { label: 'Accessories', value: 'accessories', subcategories: ['watch', 'bag', 'hat'] },
  { label: 'Electronics', value: 'electronics', subcategories: ['phone', 'tablet', 'laptop'] },
];

const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

export default function AddItem() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, getValuation, isLoading } = useItemStore();

  const [photo, setPhoto] = useState<string>('');
  const [category, setCategory] = useState('clothing');
  const [subcategory, setSubcategory] = useState('shirt');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('good');
  const [estimatedValue, setEstimatedValue] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const calculateValue = async () => {
    if (!category || !subcategory || !brand || !condition) {
      Alert.alert('Missing Info', 'Please fill in all fields first');
      return;
    }

    setCalculating(true);
    try {
      const result = await getValuation({
        category,
        subcategory,
        brand,
        condition,
      });
      setEstimatedValue(result.value);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate value');
    } finally {
      setCalculating(false);
    }
  };

  const handleAddItem = async () => {
    if (!photo) {
      Alert.alert('Missing Photo', 'Please take or select a photo');
      return;
    }

    if (!category || !subcategory || !brand || !condition) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }

    if (!estimatedValue) {
      Alert.alert('Calculate Value', 'Please calculate the item value first');
      return;
    }

    try {
      const item = await addItem({
        owner_id: user!.user_id,
        category,
        subcategory,
        brand,
        condition,
        photo,
        value: estimatedValue,
        is_fractional: false,
        share_percentage: 1.0,
      });

      Alert.alert(
        'Success',
        'Item added! Now let\'s tag it with NFC.',
        [
          {
            text: 'Tag Now',
            onPress: () => router.replace(`/items/tag-nfc?itemId=${item.item_id}`),
          },
          {
            text: 'Later',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const currentCategory = CATEGORIES.find((c) => c.value === category);
  const subcategories = currentCategory?.subcategories || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Add New Item</Text>
          </View>

          <View style={styles.photoSection}>
            {photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={pickImage}
                >
                  <Ionicons name="image" size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePicture}
                >
                  <Ionicons name="camera" size={40} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={pickImage}
                >
                  <Ionicons name="image" size={40} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    const cat = CATEGORIES.find((c) => c.value === value);
                    if (cat && cat.subcategories.length > 0) {
                      setSubcategory(cat.subcategories[0]);
                    }
                  }}
                  style={styles.picker}
                >
                  {CATEGORIES.map((cat) => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subcategory</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={subcategory}
                  onValueChange={setSubcategory}
                  style={styles.picker}
                >
                  {subcategories.map((sub) => (
                    <Picker.Item
                      key={sub}
                      label={sub.charAt(0).toUpperCase() + sub.slice(1)}
                      value={sub}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Nike, Adidas"
                value={brand}
                onChangeText={setBrand}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Condition</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={condition}
                  onValueChange={setCondition}
                  style={styles.picker}
                >
                  {CONDITIONS.map((cond) => (
                    <Picker.Item
                      key={cond}
                      label={cond.charAt(0).toUpperCase() + cond.slice(1)}
                      value={cond}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateValue}
              disabled={calculating}
            >
              {calculating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="calculator" size={20} color="#FFFFFF" />
                  <Text style={styles.calculateButtonText}>Calculate Value</Text>
                </>
              )}
            </TouchableOpacity>

            {estimatedValue !== null && (
              <View style={styles.valueContainer}>
                <Text style={styles.valueLabel}>Estimated Value:</Text>
                <Text style={styles.valueAmount}>${estimatedValue.toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.addButton,
                !estimatedValue && styles.addButtonDisabled,
              ]}
              onPress={handleAddItem}
              disabled={isLoading || !estimatedValue}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Item</Text>
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
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  photoSection: {
    marginBottom: 24,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  photoButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  calculateButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
  },
  valueLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  valueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
