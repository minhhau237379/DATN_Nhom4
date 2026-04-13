import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AppToast from "../components/AppToast";
import api from "../services/api";

type RegisterForm = {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

type Errors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
};

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") {
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

  const showNotice = (title: string, message: string) => {
    setNotice({
      visible: true,
      title,
      message,
    });
  };

  const closeNotice = () => {
    setNotice({
      visible: false,
      title: "",
      message: "",
    });
  };

  const handleChange = (name: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateEmail = () => {
    const email = form.email.trim();

    if (!email) {
      return "Vui lòng nhập email";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Email không đúng định dạng";
    }

    return null;
  };

  const validateUsername = () => {
    const username = form.username.trim();

    if (!username) {
      return "Vui lòng nhập tên đăng nhập";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Tên đăng nhập không được chứa dấu hoặc ký tự đặc biệt";
    }

    return null;
  };

  const validatePassword = () => {
    const { password } = form;

    if (password.length < 8 || password.length > 16) {
      return "Mật khẩu phải từ 8-16 ký tự";
    }

    if (!/[A-Z]/.test(password)) {
      return "Phải có ít nhất 1 chữ hoa";
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return "Phải có ít nhất 1 ký tự đặc biệt";
    }

    return null;
  };

  const handleSubmit = async () => {
    setErrors({});

    const newErrors: Errors = {};
    const usernameError = validateUsername();
    const emailError = validateEmail();
    const passwordError = validatePassword();

    if (usernameError) newErrors.username = usernameError;
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }
    if (!/^[0-9]{10,11}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = "Số điện thoại phải có 10-11 số";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber,
        password: form.password,
      });

      const data = res.data;

      if (data.success) {
        showNotice("Thành công", "Đăng ký thành công!");

        setTimeout(() => {
          closeNotice();
          router.push("/login");
        }, 1000);
      } else {
        showNotice("Lỗi", data.message || "Đăng ký thất bại");
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Không kết nối được tới máy chủ");
    }

    setLoading(false);
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Image
            source={require("../assets/images/logo.jpg")}
            style={styles.logo}
          />

          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Tham gia cùng chúng tôi ngay hôm nay</Text>

          <TextInput
            style={styles.input}
            placeholderTextColor="#000"
            placeholder="Tên đăng nhập"
            value={form.username}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            onChangeText={(value) => handleChange("username", value)}
          />

          {errors.username ? (
            <Text style={styles.error}>{errors.username}</Text>
          ) : null}

          <TextInput
            style={styles.input}
            placeholderTextColor="#000"
            placeholder="Email"
            value={form.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            onChangeText={(value) => handleChange("email", value)}
          />

          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

          <TextInput
            style={styles.input}
            placeholderTextColor="#000"
            placeholder="Số điện thoại"
            keyboardType="numeric"
            value={form.phoneNumber}
            autoComplete="tel"
            onChangeText={(value) => handleChange("phoneNumber", value)}
          />

          {errors.phoneNumber ? (
            <Text style={styles.error}>{errors.phoneNumber}</Text>
          ) : null}

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.inputPassword}
              placeholderTextColor="#000"
              placeholder="Mật khẩu"
              secureTextEntry={!showPassword}
              value={form.password}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              onChangeText={(value) => handleChange("password", value)}
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

          {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.inputPassword}
              placeholderTextColor="#000"
              placeholder="Xác nhận mật khẩu"
              secureTextEntry={!showConfirmPassword}
              value={form.confirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              onChangeText={(value) => handleChange("confirmPassword", value)}
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Image
                source={
                  showConfirmPassword
                    ? require("../assets/images/show.jpg")
                    : require("../assets/images/hide.jpg")
                }
                style={styles.eye}
              />
            </TouchableOpacity>
          </View>

          {errors.confirmPassword ? (
            <Text style={styles.error}>{errors.confirmPassword}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Tạo tài khoản</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppToast
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        onHide={closeNotice}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#f5f5f5",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    marginBottom: 10,
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
  button: {
    backgroundColor: "#000000",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: "#111",
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
});
