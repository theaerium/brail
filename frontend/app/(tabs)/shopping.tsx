import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

interface Store {
  name: string;
  url: string;
  logoUrl: string;
  icon: string;
  color: string;
}

const STORES: Store[] = [
  { 
    name: 'Other', 
    url: 'https://www.google.com', 
    logoUrl: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
    icon: 'search', 
    color: '#4285F4' 
  },
  { 
    name: 'Shop', 
    url: 'https://shop.app', 
    logoUrl: 'https://cdn.shopify.com/shop-assets/static/shop-app-icon-512x512.png',
    icon: 'bag-handle', 
    color: '#5B21B6' 
  },
  { 
    name: 'Amazon', 
    url: 'https://www.amazon.com', 
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    icon: 'logo-amazon', 
    color: '#FF9900' 
  },
  { 
    name: 'Target', 
    url: 'https://www.target.com', 
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Target_logo.svg',
    icon: 'radio-button-on', 
    color: '#CC0000' 
  },
  { 
    name: 'Lululemon', 
    url: 'https://www.lululemon.com', 
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Lululemon_Athletica_logo.svg',
    icon: 'shirt', 
    color: '#D31334' 
  },
  { 
    name: 'Walmart', 
    url: 'https://www.walmart.com', 
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg',
    icon: 'apps', 
    color: '#0071CE' 
  },
];

export default function ShoppingScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [showWebView, setShowWebView] = useState(false);
  const [url, setUrl] = useState('https://www.google.com');
  const [searchText, setSearchText] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Hide tab bar when in webview, show when in store selection
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: showWebView ? { display: 'none' } : {
        backgroundColor: '#F5F5F5',
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        elevation: 0,
        shadowOpacity: 0,
      },
    });
  }, [showWebView, navigation]);

  const handleStorePress = (storeUrl: string) => {
    setUrl(storeUrl);
    setSearchText('');
    setShowWebView(true);
  };

  const handleBackToStores = () => {
    setShowWebView(false);
    setUrl('https://www.google.com');
    setSearchText('');
  };

  const handlePayWithBrail = () => {
    if (!webViewRef.current || !user) {
      console.log('WebView or user not available');
      return;
    }

    // Prepare user data
    const userData = {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.street_address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zip_code || '',
      country: user.country || 'United States',
      // Payment info (test data)
      cardNumber: '4012888888881881',
      expiryMonth: '11',
      expiryYear: '30',
      expiryDate: '11/30',
      cvv: '234',
    };

    // JavaScript code to inject and autofill forms
    const autofillScript = `
      (function() {
        const userData = ${JSON.stringify(userData)};
        console.log('🎯 Brail Autofill Started');
        
        let filledCount = 0;
        
        // Helper function to find and fill input by multiple possible names/ids
        function fillInput(possibleNames, value, fieldType) {
          if (!value) return false;
          
          for (let name of possibleNames) {
            // Try by name, id, placeholder, autocomplete, and data attributes
            let inputs = document.querySelectorAll(\`
              input[name*="\${name}" i], 
              input[id*="\${name}" i], 
              input[placeholder*="\${name}" i],
              input[autocomplete*="\${name}" i],
              input[data-*="\${name}" i],
              input[aria-label*="\${name}" i]
            \`);
            
            for (let input of inputs) {
              if (input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button') {
                // Skip if already filled (unless it's empty)
                if (input.value && input.value.length > 0) continue;
                
                input.value = value;
                input.focus();
                
                // Trigger multiple events to ensure frameworks pick up the change
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                
                // For React/Vue apps
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                filledCount++;
                console.log(\`✅ Filled \${fieldType}: \${name}\`);
                return true;
              }
            }
          }
          console.log(\`❌ Could not find field: \${fieldType}\`);
          return false;
        }
        
        // Fill personal information
        fillInput(['firstname', 'first-name', 'fname', 'given-name', 'givenName'], userData.firstName);
        fillInput(['lastname', 'last-name', 'lname', 'family-name', 'familyName', 'surname'], userData.lastName);
        fillInput(['email', 'e-mail', 'emailaddress', 'email-address'], userData.email);
        fillInput(['phone', 'telephone', 'mobile', 'phonenumber', 'phone-number', 'tel'], userData.phone);
        fillInput(['address', 'street', 'address1', 'streetaddress', 'street-address', 'address-line1'], userData.address);
        fillInput(['city', 'town', 'locality'], userData.city);
        fillInput(['state', 'province', 'region'], userData.state);
        fillInput(['zip', 'zipcode', 'postal', 'postcode', 'postalcode', 'postal-code'], userData.zipCode);
        fillInput(['country'], userData.country);
        
        // Fill payment information - try extensive patterns
        fillInput(['cardnumber', 'card-number', 'ccnumber', 'cc-number', 'creditcard', 'credit-card', 'number', 'card', 'cardNum', 'card_number', 'payment', 'cc_number'], userData.cardNumber, 'Card Number');
        fillInput(['expiry', 'expiration', 'exp-date', 'expirydate', 'expiration-date', 'cc-exp', 'cardexpiry', 'exp', 'ccexp', 'cc-exp-date'], userData.expiryDate, 'Expiry Date');
        fillInput(['cvv', 'cvc', 'securitycode', 'security-code', 'cvv2', 'csc', 'verification', 'cvv_number', 'security_code', 'card_cvv'], userData.cvv, 'CVV');
        
        // Try to find and fill split expiry fields (MM/YY)
        fillInput(['expiry-month', 'expirymonth', 'exp-month', 'month', 'mm', 'card-month', 'ccmonth'], userData.expiryMonth, 'Expiry Month');
        fillInput(['expiry-year', 'expiryyear', 'exp-year', 'year', 'yy', 'yyyy', 'card-year', 'ccyear'], userData.expiryYear, 'Expiry Year');
        
        // ADVANCED TECHNIQUE 1: Try to access iframe content (will fail for cross-origin but worth trying)
        try {
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach((iframe, index) => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc) {
                console.log(\`✅ Accessing iframe \${index} (same-origin)\`);
                
                // Try to fill fields inside the iframe
                const iframeInputs = iframeDoc.querySelectorAll('input');
                iframeInputs.forEach(input => {
                  const name = (input.name || input.id || input.placeholder || '').toLowerCase();
                  
                  if (name.includes('card') || name.includes('number')) {
                    input.value = userData.cardNumber;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('✅ Filled card in iframe');
                    filledCount++;
                  }
                  if (name.includes('exp') || name.includes('month')) {
                    input.value = userData.expiryMonth;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filledCount++;
                  }
                  if (name.includes('year')) {
                    input.value = userData.expiryYear;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filledCount++;
                  }
                  if (name.includes('cvv') || name.includes('cvc') || name.includes('security')) {
                    input.value = userData.cvv;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('✅ Filled CVV in iframe');
                    filledCount++;
                  }
                });
              }
            } catch (e) {
              // Cross-origin iframe - expected to fail
              console.log(\`⚠️  Iframe \${index} is cross-origin (protected)\`);
            }
          });
        } catch (error) {
          console.log('⚠️  Could not access iframes');
        }
        
        // ADVANCED TECHNIQUE 2: Try to use browser autofill by setting autocomplete
        try {
          const cardInputs = document.querySelectorAll('input[autocomplete*="cc-number"], input[autocomplete*="card"]');
          cardInputs.forEach(input => {
            input.setAttribute('autocomplete', 'cc-number');
            input.value = userData.cardNumber;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            filledCount++;
          });
        } catch (error) {
          console.log('⚠️  Autocomplete technique failed');
        }
        
        // Also try dropdowns for country
        const countrySelects = document.querySelectorAll('select[name*="country" i], select[id*="country" i]');
        for (let select of countrySelects) {
          for (let option of select.options) {
            if (option.text.toLowerCase().includes(userData.country.toLowerCase()) || 
                option.value.toLowerCase().includes(userData.country.toLowerCase())) {
              select.value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
        
        // Check for iframes (common in payment gateways)
        const iframes = document.querySelectorAll('iframe');
        if (iframes.length > 0) {
          console.log(\`⚠️  Warning: Found \${iframes.length} iframe(s) on page\`);
          console.log('⚠️  Payment fields in iframes cannot be autofilled (security restriction)');
        }
        
        console.log(\`✅ Brail autofill completed - Filled \${filledCount} fields\`);
        
        if (filledCount === 0) {
          console.log('❌ No fields were filled. This might be because:');
          console.log('   1. Fields are in an iframe (Shopify/Stripe payment forms)');
          console.log('   2. Fields use non-standard names');
          console.log('   3. Page uses custom input components');
        }
      })();
      true;
    `;

    // Inject the script into the webview
    webViewRef.current.injectJavaScript(autofillScript);
  };

  const isValidUrl = (text: string): boolean => {
    // Check if it's a valid URL format
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    const domainPattern = /^[\w\.-]+\.[a-z]{2,}$/i;
    
    return urlPattern.test(text) || domainPattern.test(text);
  };

  const handleSearch = () => {
    let newUrl = searchText.trim();
    
    if (!newUrl) {
      return;
    }

    if (isValidUrl(newUrl)) {
      // It's a URL
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = 'https://' + newUrl;
      }
      setUrl(newUrl);
    } else {
      // It's a search query - use Google search
      const searchQuery = encodeURIComponent(newUrl);
      setUrl(`https://www.google.com/search?q=${searchQuery}`);
    }
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleHome = () => {
    setUrl('https://www.google.com');
    setSearchText('');
  };

  // Show store selection screen
  if (!showWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shop</Text>
          <Text style={styles.headerSubtitle}>Choose a store to browse</Text>
        </View>
        
        <ScrollView 
          style={styles.storesContainer}
          contentContainerStyle={styles.storesContent}
        >
          <View style={styles.storeGrid}>
            {STORES.map((store, index) => (
              <TouchableOpacity
                key={index}
                style={styles.storeCard}
                onPress={() => handleStorePress(store.url)}
              >
                <View style={styles.storeLogoContainer}>
                  <Image
                    source={{ uri: store.logoUrl }}
                    style={styles.storeLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.storeName}>{store.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show WebView
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search or enter website"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSearch}
              keyboardType="web-search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Navigation Controls */}
        <View style={styles.navigationBar}>
          <TouchableOpacity 
            style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
            onPress={handleGoBack}
            disabled={!canGoBack}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={canGoBack ? '#007AFF' : '#C7C7CC'} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
            onPress={handleGoForward}
            disabled={!canGoForward}
          >
            <Ionicons 
              name="arrow-forward" 
              size={24} 
              color={canGoForward ? '#007AFF' : '#C7C7CC'} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navButton}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navButton}
            onPress={handleBackToStores}
          >
            <Ionicons name="home" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
            }}
            allowsBackForwardNavigationGestures
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
          
          {/* Pay with Brail Button */}
          <TouchableOpacity 
            style={styles.brailButton}
            onPress={handlePayWithBrail}
            activeOpacity={0.8}
          >
            <Ionicons name="card" size={20} color="#FFFFFF" style={styles.brailIcon} />
            <Text style={styles.brailButtonText}>Pay with Brail</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  storesContainer: {
    flex: 1,
  },
  storesContent: {
    padding: 16,
  },
  storeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeLogoContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  storeLogo: {
    width: 80,
    height: 80,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
  },
  navigationBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  brailButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  brailIcon: {
    marginRight: 8,
  },
  brailButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
