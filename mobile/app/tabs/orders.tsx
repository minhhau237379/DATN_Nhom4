import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import BackHeader from "../../components/BackHeader";
import api from "../../services/api";

type OrderItem = {
  _id: string;
  orderNumber?: string;
  totalPrice?: number;
  createdAt?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items?: { quantity: number }[];
};

const orderStatusLabel = (value?: string) => value || "Chờ xác nhận";
const paymentStatusLabel = (value?: string) => value || "Chưa thanh toán";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get("/order");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <View style={styles.container}>
      <BackHeader title="Đơn hàng của tôi" onBack={() => router.replace("/tabs/profile")} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/orderDetail",
                params: { id: item._id },
              })
            }
          >
            <Text style={styles.code}>
              Mã đơn: {item.orderNumber || `#${item._id.slice(-6)}`}
            </Text>
            <Text style={styles.meta}>
              Ngày đặt:{" "}
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                : ""}
            </Text>
            <Text style={styles.meta}>
              Trạng thái: {orderStatusLabel(item.orderStatus)}
            </Text>
            <Text style={styles.meta}>
              Thanh toán: {item.paymentMethod || "COD"} - {paymentStatusLabel(item.paymentStatus)}
            </Text>
            <Text style={styles.meta}>
              Số sản phẩm: {item.items?.reduce((sum, product) => sum + product.quantity, 0) || 0}
            </Text>
            <Text style={styles.total}>
              Tổng tiền: {(item.totalPrice || 0).toLocaleString("vi-VN")} VND
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  code: {
    fontWeight: "700",
    fontSize: 15,
  },
  meta: {
    color: "#666",
    marginTop: 6,
  },
  total: {
    color: "#d5001c",
    fontWeight: "700",
    marginTop: 10,
  },
  emptyBox: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
});
