import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => {
        let iconName: keyof typeof Ionicons.glyphMap = "home";
        let title = "Home";

        if (route.name === "home") {
          iconName = "home";
          title = "Home";
        } else if (route.name === "payments") {
          iconName = "wallet";
          title = "Pay";
        } else if (route.name === "shopping") {
          iconName = "bag";
          title = "Shop";
        }

        return {
          title,
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            backgroundColor: "#FFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E5E5",
            height: Platform.OS === "ios" ? 85 : 65,
            paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        };
      }}
    />
  );
}
