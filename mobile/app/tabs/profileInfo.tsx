import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppToast from "../../components/AppToast";
import api from "../../services/api";

type User = {
  username?: string;
  email?: string;
  phoneNumber?: string;
};

export default function ProfileInfo() {
  const [user, setUser] = useState<User>({});
  const [isEdit, setIsEdit] = useState(false);
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

  useEffect(() => {
    api
      .get("/profile/info")
      .then((res) => setUser(res.data.user))
      .catch(console.error);
  }, []);

  const handleChange = (key: keyof User, value: string) => {
    setUser((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await api.post("/profile/edit", {
        username: user.username,
        phoneNumber: user.phoneNumber,
      });

      if (res.data.success) {
        setUser(res.data.user);
        await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
        setIsEdit(false);
        showNotice("Thông báo", "Cập nhật thành công");
      } else {
        showNotice("Lỗi", "Cập nhật thất bại");
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Có lỗi xảy ra");
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.headerWrap}>
          <Text style={styles.header}>Thông tin cá nhân</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 36 }}>U</Text>
          </View>

          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {!isEdit ? (
          <>
            <View style={styles.card}>
              <Row label="Tên người dùng" value={user.username} />
              <Row label="Email" value={user.email} />
              <Row
                label="Số điện thoại"
                value={user.phoneNumber || "Chưa cập nhật"}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setIsEdit(true)}
            >
              <Text style={styles.primaryText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Input
                label="Tên người dùng"
                value={user.username}
                onChange={(value) => handleChange("username", value)}
              />
              <Input label="Email" value={user.email} readOnly />
              <Input
                label="Số điện thoại"
                value={user.phoneNumber}
                onChange={(value) => handleChange("phoneNumber", value)}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryText}>Lưu thay đổi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setIsEdit(false)}
            >
              <Text style={styles.secondaryText}>Hủy</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <AppToast
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        onHide={closeNotice}
      />
    </>
  );
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const Input = ({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      editable={!readOnly}
      onChangeText={onChange}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  headerWrap: {
    backgroundColor: "#d5001c",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    color: "#fff7f7",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: "#ffe0b2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  username: {
    marginTop: 10,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 18,
  },
  email: {
    textAlign: "center",
    color: "#777",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    color: "#888",
  },
  value: {
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  inputLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  primaryBtn: {
    backgroundColor: "#d5001c",
    padding: 14,
    borderRadius: 30,
    marginTop: 20,
    marginHorizontal: 16,
    alignItems: "center",
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
  },
  secondaryBtn: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  secondaryText: {
    color: "#888",
  },
});
