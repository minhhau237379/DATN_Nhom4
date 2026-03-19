import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import AppBottomNav, { APP_BOTTOM_NAV_HEIGHT } from "../components/AppBottomNav";
import api from "../services/api";

type OrderItem = {
  name: string;
  image?: string;
  price: number;
  quantity: number;
};

type OrderDetail = {
  _id: string;
  orderNumber?: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
  };
  items: OrderItem[];
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const res = await api.get(`/order/${id}`);
      setOrder(res.data.order || null);
    } catch (err) {
      console.error(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#d5001c" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingBox}>
        <Text>Không tìm thấy đơn hàng</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Chi tiết đơn hàng</Text>
      </View>

      <FlatList
        data={order.items}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <Text style={styles.code}>
                Mã đơn: {order.orderNumber || `#${order._id.slice(-6)}`}
              </Text>
              <Text style={styles.meta}>
                Ngày đặt:{" "}
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString("vi-VN")
                  : ""}
              </Text>
              <Text style={styles.meta}>Trạng thái đơn: {order.orderStatus}</Text>
              <Text style={styles.meta}>
                Thanh toán: {order.paymentMethod} - {order.paymentStatus}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.fullName}</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.phone}</Text>
              <Text style={styles.addressLine}>
                {order.shippingAddress.address}, {order.shippingAddress.city}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Sản phẩm</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.meta}>Số lượng: {item.quantity}</Text>
            <Text style={styles.meta}>
              Đơn giá: {item.price.toLocaleString("vi-VN")} VND
            </Text>
            <Text style={styles.totalLine}>
              Tạm tính: {(item.price * item.quantity).toLocaleString("vi-VN")} VND
            </Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
            <Text style={styles.summaryValue}>
              {order.totalPrice.toLocaleString("vi-VN")} VND
            </Text>
          </View>
        }
      />

      <AppBottomNav active="cart" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  content: {
    padding: 16,
    paddingBottom: APP_BOTTOM_NAV_HEIGHT + 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  code: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  meta: {
    marginTop: 6,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  addressLine: {
    color: "#333",
    marginTop: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  totalLine: {
    marginTop: 10,
    color: "#d5001c",
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  summaryLabel: {
    color: "#666",
  },
  summaryValue: {
    color: "#d5001c",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6,
  },
});
