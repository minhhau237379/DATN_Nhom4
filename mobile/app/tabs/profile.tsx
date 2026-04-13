import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import AppDialog from "../../components/AppDialog";
import { isLoggedIn } from "../../utils/auth";

type User = {
  _id?: string;
  username?: string;
  email?: string;
};

export default function Profile() {
  const [user, setUser] = useState<User>({});
  const [showLogout, setShowLogout] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const res = await api.get("/profile/info");
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const guardAndLoad = async () => {
        if (!(await isLoggedIn())) {
          router.replace({
            pathname: "/need-login",
            params: { feature: "profile" },
          });
          return;
        }

        loadUser();
      };

      guardAndLoad();
    }, [loadUser]),
  );

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      router.replace("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const Item = ({
    label,
    onPress,
    isLogout,
  }: {
    label: string;
    onPress: () => void;
    isLogout?: boolean;
  }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={[styles.itemText, isLogout && styles.logoutText]}>
        {label}
      </Text>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.username}>{user?.username || "Nguoi dung"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
      </View>

      <View style={styles.card}>
        <Item
          label="Thông tin cá nhân"
          onPress={() => router.push("/tabs/profileInfo")}
        />
        <Item
          label="Địa chỉ của tôi"
          onPress={() => router.push("/tabs/address")}
        />
        <Item
          label="Đổi mật khẩu"
          onPress={() => router.push("/tabs/changePassword")}
        />
        <Item
          label="Đơn hàng của tôi"
          onPress={() => router.push("/tabs/orders")}
        />
         <Item
          label="Đăng xuất"
          onPress={() => setShowLogout(true)}
          isLogout
        />
        {/* <Item
          label="Lịch sử thanh toán"
          onPress={() => router.push("/tabs/payments")}
        /> */}
      </View>

      
        
      

      <AppDialog
        visible={showLogout}
        title="Đăng xuất"
        message="Bạn có chắc muốn đăng xuất?"
        cancelText="Hủy"
        confirmText="Đăng xuất"
        onClose={() => setShowLogout(false)}
        onConfirm={logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  headerWrap: {
    backgroundColor: "#d5001c",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerTitle: {
    color: "#fff7f7",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  profileHeader: {
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: "#ffd54f",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#7a4a00",
  },
  username: {
    fontWeight: "700",
    fontSize: 18,
    color: "#111",
  },
  email: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  itemText: {
    fontSize: 15,
    color: "#333",
  },
  logoutText: {
    color: "#e53935",
    fontWeight: "600",
  },
  arrow: {
    color: "#bbb",
    fontSize: 20,
  },
});
