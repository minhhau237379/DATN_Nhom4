import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AppBottomNav, { APP_BOTTOM_NAV_HEIGHT } from "../components/AppBottomNav";
import BackHeader from "../components/BackHeader";
import AppToast from "../components/AppToast";
import api from "../services/api";
import { resolveImageUri } from "../utils/productImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OrderItem = {
  name: string;
  image?: string | string[];
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

const orderStatusLabel = (value?: string) => {
  const map: Record<string, string> = {
    "Chờ xác nhận": "Chờ xác nhận",
    "Đã xác nhận": "Đã xác nhận",
    "Đang xử lý": "Đang xử lý",
    "Đang giao hàng": "Đang giao hàng",
    "Hoàn tất": "Hoàn tất",
    "Đã hủy": "Đã hủy",
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao hàng",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };

  return map[value || ""] || value || "Chờ xác nhận";
};

const paymentStatusLabel = (value?: string) => {
  const map: Record<string, string> = {
    "Chưa thanh toán": "Chưa thanh toán",
    "Đã thanh toán": "Đã thanh toán",
    pending: "Chưa thanh toán",
    paid: "Đã thanh toán",
    failed: "Chưa thanh toán",
    refunded: "Chưa thanh toán",
  };

  return map[value || ""] || value || "Chưa thanh toán";
};

const canCancelOrder = (orderStatus?: string) =>
  orderStatusLabel(orderStatus) === "Chờ xác nhận";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
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

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const res = await api.get(`/order/${id}`);
      setOrder(res.data.order || null);
    } catch (err) {
      console.error(err);
      setOrder(null);
      showNotice("Lỗi", "Không thể tải chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const cancelOrder = () => {
    if (!id) return;

    const runCancel = async () => {
      try {
        setCancelling(true);
        showNotice("Đang xử lý", "Đang hủy đơn hàng...");
        const res = await api.patch(`/order/${id}/cancel`);

        if (res.data?.success) {
          showNotice("Thành công", res.data.message || "Đã hủy đơn hàng");
          await loadOrder();
        } else {
          showNotice("Lỗi", res.data?.message || "Không thể hủy đơn hàng");
        }
      } catch (err: any) {
        console.error(err);
        showNotice("Lỗi", err.response?.data?.message || "Không thể hủy đơn hàng");
      } finally {
        setCancelling(false);
      }
    };

    void runCancel();
  };

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
      <BackHeader title="Chi tiết đơn hàng" onBack={() => router.replace("/tabs/orders")} />

      <FlatList
        data={order.items}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: APP_BOTTOM_NAV_HEIGHT + insets.bottom + 24 },
        ]}
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
              <Text style={styles.meta}>
                Trạng thái đơn: {orderStatusLabel(order.orderStatus)}
              </Text>
              <Text style={styles.meta}>
                Thanh toán: {order.paymentMethod} - {paymentStatusLabel(order.paymentStatus)}
              </Text>
            </View>

            {canCancelOrder(order.orderStatus) ? (
              <TouchableOpacity
                style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
                onPress={cancelOrder}
                disabled={cancelling}
              >
                <Text style={styles.cancelText}>
                  {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                </Text>
              </TouchableOpacity>
            ) : null}

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
          <View style={[styles.card, styles.productCard]}>
            <Image
              source={{ uri: resolveImageUri(item.image) }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta}>Số lượng: {item.quantity}</Text>
              <Text style={styles.meta}>
                Đơn giá: {item.price.toLocaleString("vi-VN")} VND
              </Text>
              <Text style={styles.totalLine}>
                Tạm tính: {(item.price * item.quantity).toLocaleString("vi-VN")} VND
              </Text>
            </View>
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

      <AppToast
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        onHide={closeNotice}
      />
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
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productImage: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    resizeMode: "cover",
  },
  productInfo: {
    flex: 1,
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
  cancelBtn: {
    backgroundColor: "#fff",
    borderColor: "#d5001c",
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 12,
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: "#d5001c",
    fontWeight: "700",
  },
});
