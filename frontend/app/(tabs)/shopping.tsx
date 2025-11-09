import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useItemStore } from '../../src/store/itemStore';
import { useTransactionStore, SpentItem } from '../../src/store/transactionStore';
import * as Clipboard from 'expo-clipboard';

interface Store {
  name: string;
  url: string;
  logoUrl?: any;
  icon: string;
  color: string;
}

const STORES: Store[] = [
  { 
    name: 'Other', 
    url: 'https://www.google.com', 
    icon: 'search', 
    color: '#4285F4' 
  },
  { 
    name: 'Shop', 
    url: 'https://shop.app', 
    logoUrl: require('../../assets/images/shop.png'),
    icon: 'bag-handle', 
    color: '#5B21B6' 
  },
  { 
    name: 'Amazon', 
    url: 'https://www.amazon.com', 
    logoUrl: require('../../assets/images/amazon.png'),
    icon: 'logo-amazon', 
    color: '#FF9900' 
  },
  { 
    name: 'Target', 
    url: 'https://www.target.com', 
    logoUrl: require('../../assets/images/target.png'),
    icon: 'radio-button-on', 
    color: '#CC0000' 
  },
  { 
    name: 'Lululemon', 
    url: 'https://www.lululemon.com', 
    logoUrl: require('../../assets/images/lululemon.png'),
    icon: 'shirt', 
    color: '#D31334' 
  },
  { 
    name: 'Motel Margarita', 
    url: 'https://motelmargarita.com', 
    logoUrl: require('../../assets/images/motel_margarita.png'),
    icon: 'shirt', 
    color: '#000000' 
  },
];

const TEST_PAYMENT_DETAILS = {
  cardNumber: '4012888888881881',
  expiryMonth: '11',
  expiryYear: '30',
  expiryDate: '11/30',
  cvv: '234',
};

const SHIPPING_LABEL_IMAGE = require('../../assets/images/shipping_label.png');
const DEFAULT_CHECKOUT_VALUE = 53.25;

type InventoryItem = ReturnType<typeof useItemStore>['items'][number];

export default function ShoppingScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { items, updateItem, deleteItem } = useItemStore();
  const { createTransaction } = useTransactionStore();
  const [showWebView, setShowWebView] = useState(false);
  const [url, setUrl] = useState('https://www.google.com');
  const [searchText, setSearchText] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [showCardSheet, setShowCardSheet] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkoutRequestRef = useRef<{ domain: string } | null>(null);
  const checkoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalizingCheckoutRef = useRef(false);
  const cardDetails = TEST_PAYMENT_DETAILS;
  const cardFieldRows = [
    { label: 'Card Number', value: cardDetails.cardNumber },
    { label: 'Expiry Date', value: cardDetails.expiryDate },
    { label: 'CVV', value: cardDetails.cvv },
  ];
  const [shippingPromptVisible, setShippingPromptVisible] = useState(false);
  const [shippingPromptItems, setShippingPromptItems] = useState<SpentItem[]>([]);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);

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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (checkoutTimeoutRef.current) {
        clearTimeout(checkoutTimeoutRef.current);
      }
    };
  }, []);

  const parseWebsiteName = useCallback((currentUrl: string) => {
    try {
      const hostname = new URL(currentUrl).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      return parts[0] || hostname;
    } catch (error) {
      return 'Online Shop';
    }
  }, []);

  const formatFraction = (value: number) => {
    if (value >= 0.999) {
      return 'full';
    }
    const denominators = [2, 3, 4, 5, 6, 8, 10];
    let best = { diff: Number.MAX_VALUE, num: 0, den: 1 };
    denominators.forEach((den) => {
      const num = Math.round(value * den);
      if (num === 0) {
        return;
      }
      const diff = Math.abs(value - num / den);
      if (diff < best.diff) {
        best = { diff, num, den };
      }
    });
    return `${best.num}/${best.den}`;
  };

  const buildSpentSummary = (spent: SpentItem[]) => {
    if (!spent.length) {
      return '';
    }
    return spent
      .map((item) => {
        if (item.fraction >= 0.999) {
          return item.label || 'item';
        }
        return `${formatFraction(item.fraction)} of ${item.label || 'item'}`;
      })
      .join(', ');
  };

  const allocateItemsForSpend = useCallback(
    (amount: number) => {
      const sorted = [...items].sort((a, b) => (a.value || 0) - (b.value || 0));
      const allocations: { item: InventoryItem; amount: number; fraction: number }[] = [];
      let remaining = parseFloat(amount.toFixed(2));

      for (const item of sorted) {
        if (remaining <= 0) {
          break;
        }
        if (!item.value || item.value <= 0) {
          continue;
        }
        const allocation = Math.min(item.value, remaining);
        allocations.push({
          item,
          amount: parseFloat(allocation.toFixed(2)),
          fraction: Math.min(1, allocation / item.value),
        });
        remaining = parseFloat((remaining - allocation).toFixed(2));
      }

      return { allocations, remaining };
    },
    [items],
  );

  const extractPriceFromText = useCallback((text: string) => {
    if (!text) {
      return null;
    }
    const normalized = text.replace(/\s+/g, ' ');
    const priorityPatterns = [
      /(order total|grand total|amount due)[^$]*\$?([\d,.]+)/i,
      /(total)[^$]*\$?([\d,.]+)/i,
      /\$\s*([\d,.]+)/,
    ];

    for (const pattern of priorityPatterns) {
      const match = normalized.match(pattern);
      const numericGroup = match && (match[2] || match[1]);
      if (numericGroup) {
        const value = parseFloat(numericGroup.replace(/,/g, ''));
        if (!Number.isNaN(value)) {
          return value;
        }
      }
    }

    return null;
  }, []);

  const finalizeCheckoutTransaction = useCallback(
    async (amountOverride?: number) => {
      if (finalizingCheckoutRef.current) {
        return;
      }
      finalizingCheckoutRef.current = true;
      if (checkoutTimeoutRef.current) {
        clearTimeout(checkoutTimeoutRef.current);
        checkoutTimeoutRef.current = null;
      }

      const pending = checkoutRequestRef.current;
      checkoutRequestRef.current = null;

      if (!pending || !user) {
        return;
      }

      const amountToSpend = amountOverride && amountOverride > 0 ? amountOverride : DEFAULT_CHECKOUT_VALUE;

      if (!items.length) {
        Alert.alert('No Funds', 'Deposit an item before checking out with Brail.');
        return;
      }

      const { allocations, remaining } = allocateItemsForSpend(amountToSpend);

      if (!allocations.length || remaining > 0.01) {
        Alert.alert('Insufficient Balance', 'You do not have enough deposited value to cover this purchase.');
        return;
      }

      try {
        for (const allocation of allocations) {
          const itemLeft = allocation.item.value - allocation.amount;
          if (itemLeft <= 0.01) {
            await deleteItem(allocation.item.item_id);
          } else {
            await updateItem(allocation.item.item_id, { value: parseFloat(itemLeft.toFixed(2)) });
          }
        }

        const spentItemsPayload: SpentItem[] = allocations.map((allocation) => ({
          item_id: allocation.item.item_id,
          label: `${allocation.item.brand} ${allocation.item.subcategory}`.trim(),
          amount: parseFloat(allocation.amount.toFixed(2)),
          fraction: parseFloat(Math.min(1, allocation.fraction).toFixed(3)),
        }));

        const merchantName = pending.domain;
        const spentSummary = buildSpentSummary(spentItemsPayload);

        await createTransaction({
          user_id: user.user_id,
          type: 'payment',
          amount: parseFloat(amountToSpend.toFixed(2)),
          merchant_name: merchantName,
          website_name: merchantName,
          status: 'completed',
          description: spentSummary ? `Spent ${spentSummary}` : undefined,
          spent_items: spentItemsPayload,
        });

        setShippingPromptItems(spentItemsPayload);
        setShippingPromptVisible(true);
        setShowShippingLabel(false);
      } catch (error: any) {
        console.error('Failed to finalize checkout', error);
        Alert.alert('Checkout Failed', error?.message || 'Unable to complete payment.');
      }
    },
    [allocateItemsForSpend, createTransaction, deleteItem, items, updateItem, user],
  );

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

  const buildUserData = () => ({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.street_address || '',
    address2: user?.street_address_2 || '',
    city: user?.city || '',
    state: user?.state || '',
    zipCode: user?.zip_code || '',
    country: user?.country || 'United States',
    ...cardDetails,
  });

  const handlePayWithBrail = () => {
    if (!webViewRef.current || !user) {
      console.log('WebView or user not available');
      return;
    }

    if (!items.length) {
      Alert.alert('No Funds', 'Deposit an item to cover the purchase before paying with Brail.');
      return;
    }

    const userData = buildUserData();
    const merchant = parseWebsiteName(url);
    checkoutRequestRef.current = { domain: merchant };
    finalizingCheckoutRef.current = false;
    if (checkoutTimeoutRef.current) {
      clearTimeout(checkoutTimeoutRef.current);
    }
    checkoutTimeoutRef.current = setTimeout(() => {
      finalizeCheckoutTransaction();
    }, 1800);

    const snapshotScript = `
      (function() {
        try {
          const bodyText = document.body ? document.body.innerText : '';
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'checkoutContent', text: bodyText }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'checkoutContent', text: '' }));
        }
      })();
      true;
    `;

    webViewRef.current.injectJavaScript(snapshotScript);

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
        fillInput(['address2', 'address-2', 'address-line2', 'apartment', 'apt', 'suite', 'unit'], userData.address2);
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
    setShowCardSheet(true);
    setCopiedField(null);
  };

  const handleCopyField = async (value: string, fieldLabel: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    setCopiedField(fieldLabel);
    copyTimeoutRef.current = setTimeout(() => setCopiedField(null), 2000);
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

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'checkoutContent') {
          const parsedPrice = extractPriceFromText(data.text);
          finalizeCheckoutTransaction(parsedPrice || undefined);
        }
      } catch (error) {
        console.log('Unable to parse webview message');
      }
    },
    [extractPriceFromText, finalizeCheckoutTransaction],
  );


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
                  {store.logoUrl ? (
                    <Image
                      source={store.logoUrl}
                      style={styles.storeLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name={store.icon as any} size={60} color={store.color} />
                  )}
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
            onMessage={handleWebViewMessage}
            allowsBackForwardNavigationGestures
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        </View>

        {/* Pay with Brail Button - Bottom of screen */}
        <TouchableOpacity 
          style={styles.brailButton}
          onPress={handlePayWithBrail}
          activeOpacity={0.8}
        >
          <Ionicons name="card" size={14} color="#FFFFFF" style={styles.brailIcon} />
          <Text style={styles.brailButtonText}>Pay with Brail</Text>
        </TouchableOpacity>
        {showCardSheet && (
          <View style={styles.cardSheetOverlay} pointerEvents="box-none">
            <View style={styles.cardSheet} pointerEvents="auto">
              <View style={styles.cardSheetHeader}>
                <Text style={styles.modalTitle}>Enter your Brail card details</Text>
                <TouchableOpacity onPress={() => setShowCardSheet(false)}>
                  <Ionicons name="close" size={20} color="#333" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Copy the card values below and paste them into the secure payment fields.
              </Text>

              {cardFieldRows.map((row) => (
                <View key={row.label} style={styles.cardFieldRow}>
                  <View>
                    <Text style={styles.cardFieldLabel}>{row.label}</Text>
                    <Text style={styles.cardFieldValue}>{row.value}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => handleCopyField(row.value, row.label)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={copiedField === row.label ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color="#FFFFFF"
                      style={styles.copyIcon}
                    />
                    <Text style={styles.copyButtonText}>
                      {copiedField === row.label ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCardSheet(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {shippingPromptVisible && (
          <View style={styles.shippingPromptContainer}>
            <TouchableOpacity
              style={styles.shippingPromptButton}
              onPress={() => {
                setShippingPromptVisible(false);
                setShippingModalVisible(true);
              }}
            >
              <Ionicons name="cube" size={16} color="#fff" />
              <Text style={styles.shippingPromptText}>Ship spent items</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={shippingModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShippingModalVisible(false);
            setShippingPromptItems([]);
            setShowShippingLabel(false);
          }}
        >
          <View style={styles.shippingModalOverlay}>
            <View style={styles.shippingModalCard}>
              <Text style={styles.shippingModalTitle}>Items to ship</Text>
              <Text style={styles.shippingModalSubtitle}>
                Send the items you just spent so we can deliver them to the merchant.
              </Text>

              <ScrollView style={{ maxHeight: 220 }}>
                {shippingPromptItems.map((item) => (
                  <View key={item.item_id} style={styles.shippingItemRow}>
                    <Ionicons name="cube-outline" size={18} color="#000" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shippingItemLabel}>{item.label}</Text>
                      <Text style={styles.shippingItemMeta}>
                        {item.fraction >= 0.999
                          ? 'Full item'
                          : `${formatFraction(item.fraction)} used`} · ${item.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.shippingLabelButton}
                onPress={() => setShowShippingLabel((prev) => !prev)}
              >
                <Text style={styles.shippingLabelButtonText}>
                  {showShippingLabel ? 'Hide shipping label' : 'View shipping label'}
                </Text>
              </TouchableOpacity>

              {showShippingLabel && (
                <Image source={SHIPPING_LABEL_IMAGE} style={styles.shippingLabelImage} resizeMode="contain" />
              )}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShippingModalVisible(false);
                  setShippingPromptItems([]);
                  setShowShippingLabel(false);
                }}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  brailIcon: {
    marginRight: 6,
  },
  brailButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardSheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  cardSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  cardSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardFieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFieldValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    color: '#111111',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  copyIcon: {
    marginRight: 2,
  },
  modalCloseButton: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    borderRadius: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shippingPromptContainer: {
    position: 'absolute',
    right: 16,
    bottom: 120,
  },
  shippingPromptButton: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shippingPromptText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shippingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  shippingModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  shippingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  shippingModalSubtitle: {
    color: '#555',
    marginBottom: 16,
  },
  shippingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  shippingItemLabel: {
    fontWeight: '600',
    color: '#111',
  },
  shippingItemMeta: {
    color: '#555',
    fontSize: 13,
  },
  shippingLabelButton: {
    marginTop: 8,
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  shippingLabelButtonText: {
    color: '#F0EC57',
    fontWeight: '600',
  },
  shippingLabelImage: {
    width: '100%',
    height: 260,
    marginTop: 16,
    borderRadius: 12,
  },
});
