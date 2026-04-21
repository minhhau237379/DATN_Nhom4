import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { getStoredToken } from "../../utils/auth";

export default function RootLayout() {
  const [hasToken, setHasToken] = useState(false);

  const loadToken = useCallback(async () => {
    const token = await getStoredToken();
    setHasToken(Boolean(token));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadToken();
    }, [loadToken]),
  );

  const guardTab = (feature: "favorite" | "chat" | "cart" | "profile") => ({
    tabPress: (event: { preventDefault: () => void }) => {
      if (hasToken) {
        return;
      }

      event.preventDefault();
      router.push({
        pathname: "/need-login",
        params: { feature },
      });
    },
  });

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#e30019",
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            marginBottom: Platform.OS === "android" ? 20 : 0,
          },
        }}
      >
        <Tabs.Screen
          name="product"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="favorites"
          listeners={guardTab("favorite")}
          options={{
            title: "Yêu thích",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="chat"
          listeners={guardTab("chat")}
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbox-ellipses-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="productDetail"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="profileInfo"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="address"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="addressAdd"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="changePassword"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="payments"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="cart"
          listeners={guardTab("cart")}
          options={{
            title: "Giỏ hàng",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          listeners={guardTab("profile")}
          options={{
            title: "Tài khoản",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <StatusBar style="auto" />
    </>
  );
}
