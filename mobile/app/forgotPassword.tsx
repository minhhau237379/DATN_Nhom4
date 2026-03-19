import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import AppToast from "../components/AppToast";
import api from "../services/api";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });

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

  const sendOtp = async () => {
    if (!email.trim()) {
      showNotice("Thông báo", "Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email });

      if (res.data.success) {
        setStep(2);
        showNotice("Thông báo", "Mã OTP đã được gửi tới email của bạn");
      } else {
        showNotice("Lỗi", res.data.message || "Không thể gửi OTP");
      }
    } catch (err: any) {
      showNotice("Lỗi", err.response?.data?.message || "Không thể gửi OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length !== 6) {
      showNotice("Thông báo", "Vui lòng nhập đầy đủ 6 chữ số OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-otp", { email, otp });

      if (res.data.success) {
        setStep(3);
        showNotice("Thành công", "Xác nhận OTP thành công");
      } else {
        showNotice("Lỗi", res.data.message || "Không thể xác nhận OTP");
      }
    } catch (err: any) {
      showNotice("Lỗi", err.response?.data?.message || "Không thể xác nhận OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showNotice("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotice("Thông báo", "Mật khẩu nhập lại không khớp");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        email,
        newPassword,
      });

      if (res.data.success) {
        showNotice("Thành công", "Đặt lại mật khẩu thành công");
        setTimeout(() => {
          router.replace("/login");
        }, 1200);
      } else {
        showNotice("Lỗi", res.data.message || "Không thể đặt lại mật khẩu");
      }
    } catch (err: any) {
      showNotice("Lỗi", err.response?.data?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Nhập email để nhận mã OTP"
              : step === 2
                ? "Nhập mã OTP để xác nhận"
                : "Đặt mật khẩu mới"}
          </Text>

          {step === 1 ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nhập email đã đăng ký"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={sendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Gửi mã OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã OTP 6 chữ số"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={verifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Xác nhận OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword((prev) => !prev)}>
                  <Image
                    source={
                      showNewPassword
                        ? require("../assets/images/show.jpg")
                        : require("../assets/images/hide.jpg")
                    }
                    style={styles.eye}
                  />
                </TouchableOpacity>
              </View>
              <View style={[styles.passwordWrapper, styles.inputGap]}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
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
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={submitNewPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Đặt lại mật khẩu</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: "#666",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  inputGap: {
    marginTop: 12,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    paddingLeft: 14,
    paddingRight: 10,
  },
  inputPassword: {
    flex: 1,
    paddingVertical: 12,
  },
  eye: {
    width: 22,
    height: 22,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#d5001c",
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  backBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  backText: {
    color: "#666",
    fontWeight: "600",
  },
});
