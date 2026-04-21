import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const getFeatureMessage = (feature?: string | string[]) => {
  const value = Array.isArray(feature) ? feature[0] : feature;

  switch (value) {
    case "favorite":
      return "Vui lòng đăng nhập để sử dụng yêu thích";
    case "chat":
      return "Vui lòng đăng nhập để chat với admin";
    case "cart":
      return "Vui lòng đăng nhập để sử dụng giỏ hàng";
    case "profile":
      return "Vui lòng đăng nhập để sử dụng tài khoản";
    default:
      return "Vui lòng đăng nhập để sử dụng tính năng này";
  }
};

export default function NeedLoginScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string | string[] }>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.message}>{getFeatureMessage(feature)}</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryText}>Đăng nhập ngay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/tabs/product")}
        >
          <Text style={styles.secondaryText}>Quay lại trang sản phẩm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  icon: {
    fontSize: 54,
    marginBottom: 18,
  },
  message: {
    fontSize: 18,
    lineHeight: 30,
    textAlign: "center",
    color: "#222",
    marginBottom: 26,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#e30019",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#9aa4b2",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  secondaryText: {
    color: "#617187",
    fontSize: 17,
  },
});
