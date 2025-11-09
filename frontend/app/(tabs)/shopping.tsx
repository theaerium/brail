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
  const [showWebView, setShowWebView] = useState(false);
  const [url, setUrl] = useState('https://www.google.com');
  const [searchText, setSearchText] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

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
        {/* Back Button & Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.backToStoresButton}
            onPress={handleBackToStores}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToStoresButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
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
});
