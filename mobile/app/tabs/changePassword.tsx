import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BackHeader from "../../components/BackHeader";
import AppToast from "../../components/AppToast";
import api from "../../services/api";

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });

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

  const submit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showNotice("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotice("Thông báo", "Mật khẩu nhập lại không khớp");
      return;
    }

    try {
      const res = await api.post("/profile/change-password", {
        oldPassword,
        newPassword,
      });

      if (res.data.success) {
        showNotice("Thông báo", "Đổi mật khẩu thành công");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showNotice("Lỗi", res.data.message || "Không thể đổi mật khẩu");
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Có lỗi xảy ra");
    }
  };

  return (
    <>
      <View style={styles.container}>
        <BackHeader title="Đổi mật khẩu" />

        <View style={styles.card}>
          <Input
            placeholder="Mật khẩu hiện tại"
            value={oldPassword}
            onChangeText={setOldPassword}
            visible={showOldPassword}
            onToggleVisible={() => setShowOldPassword((prev) => !prev)}
            autoComplete="current-password"
          />
          <Input
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNewPassword}
            onToggleVisible={() => setShowNewPassword((prev) => !prev)}
            autoComplete="new-password"
          />
          <Input
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
            autoComplete="new-password"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={submit}>
            <Text style={styles.submitText}>Lưu thay đổi</Text>
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

const Input = ({
  placeholder,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete?: "current-password" | "new-password";
}) => (
  <View style={styles.inputWrapper}>
    <TextInput
      style={styles.input}
      placeholderTextColor="#000"
      placeholder={placeholder}
      secureTextEntry={!visible}
      value={value}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      onChangeText={onChangeText}
    />

    <TouchableOpacity onPress={onToggleVisible}>
      <Image
        source={
          visible
            ? require("../../assets/images/show.jpg")
            : require("../../assets/images/hide.jpg")
        }
        style={styles.eye}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },
  card: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  inputWrapper: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  eye: {
    width: 22,
    height: 22,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: "#d5001c",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  submitText: {
    color: "white",
    fontWeight: "700",
  },
});





