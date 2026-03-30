import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AppToast from "../../components/AppToast";
import BackHeader from "../../components/BackHeader";
import api from "../../services/api";

export default function AddressAddScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const addressId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEdit = Boolean(addressId);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });
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

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!addressId) {
      return;
    }

    const loadAddress = async () => {
      try {
        const res = await api.get("/address/list");
        const address = (res.data || []).find((item: any) => item._id === addressId);

        if (address) {
          setForm({
            fullName: address.fullName || "",
            phone: address.phone || "",
            address: address.address || "",
            city: address.city || "",
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    void loadAddress();
  }, [addressId]);

  const submit = async () => {
    if (!form.fullName || !form.phone || !form.address || !form.city) {
      showNotice("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      const res = isEdit
        ? await api.post(`/address/update/${addressId}`, form)
        : await api.post("/address/add", form);
      if (res.data.success) {
        router.back();
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Không thể thêm địa chỉ");
    }
  };

  return (
    <>
      <View style={styles.container}>
        <BackHeader title={isEdit ? "Sửa địa chỉ" : "Thêm địa chỉ"} />

        <View style={styles.form}>
          <Input
            label="Họ tên"
            value={form.fullName}
            onChangeText={(value) => handleChange("fullName", value)}
          />
          <Input
            label="Số điện thoại"
            value={form.phone}
            onChangeText={(value) => handleChange("phone", value)}
          />
          <Input
            label="Địa chỉ"
            value={form.address}
            onChangeText={(value) => handleChange("address", value)}
          />
          <Input
            label="Thành phố"
            value={form.city}
            onChangeText={(value) => handleChange("city", value)}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={submit}>
            <Text style={styles.submitText}>
              {isEdit ? "Cập nhật địa chỉ" : "Lưu địa chỉ"}
            </Text>
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
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChangeText} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },
  form: {
    padding: 16,
  },
  label: {
    marginBottom: 6,
    color: "#666",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submitBtn: {
    marginTop: 12,
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
