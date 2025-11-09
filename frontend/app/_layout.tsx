import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GiveYouGlory: require("../assets/fonts/GiveYouGlory-Regular.ttf"),
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/personal-info"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile/personal-information"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="deposit/capture" options={{ headerShown: false }} />
        <Stack.Screen name="deposit/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="deposit/tag-nfc" options={{ headerShown: false }} />
        <Stack.Screen name="items/add" options={{ headerShown: false }} />
        <Stack.Screen name="items/tag-nfc" options={{ headerShown: false }} />
        <Stack.Screen
          name="payment/customer-select"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="payment/merchant-input"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="payment/accept-payment"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="payment/confirm-trade"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="transactions/list"
          options={{ headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
