import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import api from "../services/api";

type LoginForm = {
  username: string;
  password: string;
};

export default function Login() {
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorUser, setErrorUser] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const styleId = "app-autofill-reset";
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-text-fill-color: #111 !important;
        -webkit-box-shadow: 0 0 0 1000px #fafafa inset !important;
        box-shadow: 0 0 0 1000px #fafafa inset !important;
        transition: background-color 9999s ease-out 0s;
        caret-color: #111 !important;
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  const handleLogin = async () => {
    setErrorUser("");
    setErrorPass("");
    setMessage("");

    if (!form.username) {
      setErrorUser("Vui lòng nhập tên đăng nhập hoặc email");
      return;
    }

    if (!form.password) {
      setErrorPass("Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", form);
      const result = res.data;

      if (result.success) {
        if (result.data?.token) {
          await AsyncStorage.setItem("token", result.data.token);
        }

        if (result.data?.user) {
          await AsyncStorage.setItem("user", JSON.stringify(result.data.user));
        }

        router.replace("/tabs/product");
      } else {
        setMessage(result.message || "Đăng nhập thất bại");

        if (result.message?.toLowerCase().includes("khong ton tai")) {
          setErrorUser("Tên đăng nhập hoặc email không tồn tại");
        }

        if (result.message?.toLowerCase().includes("mat khau")) {
          setErrorPass("Mật khẩu không chính xác");
        }
      }
    } catch (err) {
      console.log(err);

      if (isAxiosError(err)) {
        const serverMessage = err.response?.data?.message;

        if (serverMessage) {
          setMessage(serverMessage);

          const normalizedMessage = serverMessage.toLowerCase();

          if (normalizedMessage.includes("khong ton tai")) {
            setErrorUser("Tên đăng nhập hoặc email không tồn tại");
          }

          if (normalizedMessage.includes("mat khau")) {
            setErrorPass("Mật khẩu không chính xác");
          }
        } else {
          setMessage("Đã xảy ra lỗi kết nối");
        }
      } else {
        setMessage("Đã xảy ra lỗi kết nối");
      }
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.jpg")}
            style={styles.logo}
          />

          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập vào tài khoản của bạn</Text>
        </View>

        {message ? <Text style={styles.alert}>{message}</Text> : null}

        <Text style={styles.label}>Tên đăng nhập hoặc Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập tên đăng nhập hoặc email"
          value={form.username}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          onChangeText={(text) => setForm({ ...form, username: text })}
        />

        {errorUser ? <Text style={styles.error}>{errorUser}</Text> : null}

        <Text style={styles.label}>Mật khẩu</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry={!showPassword}
            value={form.password}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            onChangeText={(text) => setForm({ ...form, password: text })}
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={
                showPassword
                  ? require("../assets/images/show.jpg")
                  : require("../assets/images/hide.jpg")
              }
              style={styles.eye}
            />
          </TouchableOpacity>
        </View>

        {errorPass ? <Text style={styles.error}>{errorPass}</Text> : null}

        <TouchableOpacity onPress={() => router.push("/forgotPassword")}>
          <Text style={styles.link}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  label: {
    marginTop: 10,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    backgroundColor: "#fafafa",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#fafafa",
  },
  inputPassword: {
    flex: 1,
    padding: 12,
  },
  eye: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  loginButton: {
    backgroundColor: "#000000",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  loginText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  error: {
    color: "red",
    marginTop: 4,
  },
  alert: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
});
