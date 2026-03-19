import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableWithoutFeedback
} from "react-native";
import { router } from "expo-router";

/* ================= TEXT ================= */

const loadingTexts = [
  "Đang tải ứng dụng...",
  "Khởi tạo hệ thống...",
  "Kết nối cơ sở dữ liệu...",
  "Sẵn sàng!",
  "Chào mừng đến với HoppyStore88!",
];

export default function Splash() {
  const [textIndex, setTextIndex] = useState(0);
  const fadeAnim = new Animated.Value(1);

  /* ================= TEXT ANIMATION ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 1500);

    const timeout = setTimeout(() => {
      router.replace("/tabs/product");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  /* ================= UI ================= */

  return (
    <TouchableWithoutFeedback onPress={() => router.replace("/tabs/product")}>
      <View style={styles.container}>
        {/* LOGO */}
        <Animated.View style={styles.logoBox}>
          <Image
            source={require("../assets/images/logo.jpg")} // nhớ đúng path
            style={styles.logo}
          />
        </Animated.View>

        {/* TITLE */}
        <Text style={styles.title}>HoppyStore88</Text>

        <Text style={styles.tagline}>
          Nền tảng mua sắm thông minh - Kết nối người tiêu dùng với những sản
          phẩm chất lượng nhất
        </Text>

        {/* FEATURES */}
        <View style={styles.features}>
          <Text style={styles.feature}>🛒 Mua sắm tiện lợi</Text>
          <Text style={styles.feature}>🚚 Giao hàng nhanh</Text>
          <Text style={styles.feature}>⭐ Đảm bảo chất lượng</Text>
        </View>

        {/* LOADING */}
        <View style={styles.loadingBox}>
          <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
            {loadingTexts[textIndex]}
          </Animated.Text>

          <View style={styles.loadingBar}>
            <Animated.View style={styles.loadingProgress} />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  logoBox: {
    marginBottom: 30,
  },

  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 10,
  },

  tagline: {
    textAlign: "center",
    color: "white",
    opacity: 0.9,
    marginBottom: 30,
  },

  features: {
    flexDirection: "column",
    gap: 10,
    marginTop: 20,
  },

  feature: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 20,
    color: "white",
    textAlign: "center",
  },

  loadingBox: {
    marginTop: 40,
    alignItems: "center",
  },

  loadingText: {
    color: "white",
    marginBottom: 10,
  },

  loadingBar: {
    width: 200,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },

  loadingProgress: {
    width: "100%",
    height: "100%",
    backgroundColor: "#00c6ff",
  },
});
