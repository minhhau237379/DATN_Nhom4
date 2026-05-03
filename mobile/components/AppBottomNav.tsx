import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isLoggedIn } from "../utils/auth";

type TabKey = "home" | "favorite" | "chat" | "cart" | "profile";

type AppBottomNavProps = {
  active: TabKey;
};

const CHAT_ICON_SOURCE: string | null = null;

const tabs: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/tabs/product" | "/tabs/favorites" | "/tabs/chat" | "/tabs/cart" | "/tabs/profile";
}[] = [
  {
    key: "home",
    label: "Home",
    icon: "home",
    route: "/tabs/product",
  },
  {
    key: "favorite",
    label: "Yêu thích",
    icon: "heart",
    route: "/tabs/favorites",
  },
  {
    key: "chat",
    label: "Chat",
    icon: "chatbox-ellipses-outline",
    route: "/tabs/chat",
  },
  {
    key: "cart",
    label: "Giỏ hàng",
    icon: "cart",
    route: "/tabs/cart",
  },
  {
    key: "profile",
    label: "Tài khoản",
    icon: "person",
    route: "/tabs/profile",
  },
];

/** Chiều cao ước lượng (padding + hàng icon/chữ), dùng cho contentInset scroll — không gồm vùng an toàn dưới. */
export const APP_BOTTOM_NAV_HEIGHT = 76;

/** Một số máy Android trả `insets.bottom === 0` dù vẫn có thanh điều hướng — tránh thanh custom “lơ lửng”. */
export function resolveNavSafeAreaBottom(insetBottom: number) {
  return Math.max(
    insetBottom,
    Platform.OS === "android" && insetBottom === 0 ? 12 : 0,
  );
}

export default function AppBottomNav({ active }: AppBottomNavProps) {
  const insets = useSafeAreaInsets();
  const safeBottom = resolveNavSafeAreaBottom(insets.bottom);

  const handlePress = async (tab: (typeof tabs)[number]) => {
    const protectedTabs: TabKey[] = ["favorite", "chat", "cart", "profile"];

    if (protectedTabs.includes(tab.key) && !(await isLoggedIn())) {
      router.push({
        pathname: "/need-login",
        params: { feature: tab.key },
      });
      return;
    }

    router.replace(tab.route);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: 8 + safeBottom,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => handlePress(tab)}
          >
            {tab.key === "chat" && CHAT_ICON_SOURCE ? (
              <Image
                source={{ uri: CHAT_ICON_SOURCE }}
                style={[
                  styles.chatIcon,
                  { tintColor: isActive ? "#e30019" : "#8a8a8a" },
                ]}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? "#e30019" : "#8a8a8a"}
              />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e9e9e9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 6,
    minHeight: APP_BOTTOM_NAV_HEIGHT,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: "#8a8a8a",
  },
  labelActive: {
    color: "#e30019",
    fontWeight: "600",
  },
  chatIcon: {
    width: 24,
    height: 24,
  },
});
