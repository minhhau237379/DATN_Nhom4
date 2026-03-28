import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

type PaymentItem = {
  _id: string;
  orderNumber?: string;
  totalPrice?: number;
  createdAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
};

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const loadPayments = useCallback(async () => {
    try {
      const res = await api.get("/order");
      const paidOrders = (res.data.orders || []).filter(
        (item: PaymentItem) =>
          item.paymentMethod === "VNPAY" || item.paymentStatus === "paid",
      );
      setPayments(paidOrders);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Lịch sử thanh toán</Text>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.code}>
              {item.orderNumber || `Thanh toan #${item._id.slice(-6)}`}
            </Text>
            <Text style={styles.meta}>
              Ngày:{" "}
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                : ""}
            </Text>
            <Text style={styles.meta}>
              Phương thức: {item.paymentMethod || "VNPAY"}
            </Text>
            <Text style={styles.meta}>
              Trạng thái: {item.paymentStatus || "paid"}
            </Text>
            <Text style={styles.total}>
              Số tiền: {(item.totalPrice || 0).toLocaleString("vi-VN")} VND
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Chưa có giao dịch online</Text>
            <Text style={styles.emptyText}>
              Các đơn thanh toán online sẽ hiển thị tại đây.
            </Text>
          </View>
        }
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
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  code: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  meta: {
    marginTop: 6,
    color: "#666",
  },
  total: {
    marginTop: 10,
    color: "#d5001c",
    fontWeight: "700",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  emptyText: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
  },
});
