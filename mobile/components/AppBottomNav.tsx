import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isLoggedIn } from "../utils/auth";

type TabKey = "home" | "favorite" | "cart" | "profile";

type AppBottomNavProps = {
  active: TabKey;
};

const tabs: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/tabs/product" | "/tabs/favorites" | "/tabs/cart" | "/tabs/profile";
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

export const APP_BOTTOM_NAV_HEIGHT = 76;

export default function AppBottomNav({ active }: AppBottomNavProps) {
  const handlePress = async (tab: (typeof tabs)[number]) => {
    const protectedTabs: TabKey[] = ["favorite", "cart", "profile"];

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
    <View style={styles.wrapper}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => handlePress(tab)}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? "#e30019" : "#8a8a8a"}
            />
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
    height: APP_BOTTOM_NAV_HEIGHT,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e9e9e9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
    paddingTop: 6,
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
});
