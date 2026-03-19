import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AppDialog from "../../components/AppDialog";
import api from "../../services/api";

type AddressItem = {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  isDefault?: boolean;
};

export default function AddressScreen() {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
    addressId: "",
  });

  const loadAddress = useCallback(async () => {
    try {
      const res = await api.get("/address/list");
      setAddresses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddress();
    }, [loadAddress]),
  );

  const setDefault = async (id: string) => {
    await api.post(`/address/set-default/${id}`);
    loadAddress();
  };

  const deleteAddress = (id: string) => {
    setDialog({
      visible: true,
      title: "Xóa địa chỉ",
      message: "Bạn có chắc muốn xóa địa chỉ này?",
      addressId: id,
    });
  };

  const closeDialog = () => {
    setDialog({
      visible: false,
      title: "",
      message: "",
      addressId: "",
    });
  };

  const confirmDeleteAddress = async () => {
    try {
      await api.post(`/address/delete/${dialog.addressId}`);
      closeDialog();
      loadAddress();
    } catch (err) {
      console.error(err);
      closeDialog();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Địa chỉ của tôi</Text>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.fullName} | {item.phone}
            </Text>
            <Text style={styles.text}>
              {item.address}, {item.city}
            </Text>

            {item.isDefault ? <Text style={styles.badge}>Mặc định</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setDefault(item._id)}
              >
                <Text style={styles.actionText}>Chọn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => deleteAddress(item._id)}
              >
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push("/tabs/addressAdd")}
      >
        <Text style={styles.addText}>+ Thêm địa chỉ</Text>
      </TouchableOpacity>

      <AppDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        cancelText="Hủy"
        confirmText="Xóa"
        onClose={closeDialog}
        onConfirm={confirmDeleteAddress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },
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
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  name: { fontWeight: "700", fontSize: 15 },
  text: { color: "#666", marginTop: 6 },
  badge: {
    color: "#d5001c",
    fontWeight: "700",
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#ffe5e5",
  },
  deleteText: {
    color: "#d5001c",
    fontWeight: "600",
  },
  addBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 78,
    backgroundColor: "#d5001c",
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: "center",
  },
  addText: {
    color: "white",
    fontWeight: "700",
  },
  emptyBox: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
});
