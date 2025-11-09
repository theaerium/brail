import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PersonalInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username?: string | string[]; pinHash?: string | string[] }>();
  const registrationUsername = Array.isArray(params.username) ? params.username[0] : params.username;
  const registrationPinHash = Array.isArray(params.pinHash) ? params.pinHash[0] : params.pinHash;
  const { setUser } = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('USA');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!registrationUsername || !registrationPinHash) {
      Alert.alert('Error', 'Missing registration data');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username: registrationUsername,
        pin_hash: registrationPinHash,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        street_address: streetAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        country: country || undefined,
      });

      // Store user
      await setUser(response.data, registrationPinHash);

      Alert.alert(
        'Success!',
        'Your account has been created successfully!',
        [
          { text: 'Get Started', onPress: () => router.replace('/(tabs)/home') },
        ]
      );
    } catch (error: any) {
      console.error('Registration failed:', error);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'Could not complete registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>Personal Information</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Tell us about yourself</Text>
          <Text style={styles.description}>
            This information helps us provide better service. You can always update it later from your profile.
          </Text>

          {/* Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={streetAddress}
                onChangeText={setStreetAddress}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.spacer} />
              <View style={[styles.inputContainer, styles.flex1]}>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <TextInput
                  style={styles.input}
                  placeholder="ZIP Code"
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View style={styles.spacer} />
              <View style={[styles.inputContainer, styles.flex1]}>
                <Ionicons name="globe-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Country"
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>Complete Registration</Text>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
