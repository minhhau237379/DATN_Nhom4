import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import BackHeader from "../../components/BackHeader";
import AppToast from "../../components/AppToast";
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

const WAITING_CONFIRM_STATUS = "Chờ xác nhận";

const orderStatusLabel = (value?: string) => {
  const map: Record<string, string> = {
    pending: WAITING_CONFIRM_STATUS,
    cho_xu_ly: WAITING_CONFIRM_STATUS,
    confirmed: "Đã xác nhận",
    da_xac_nhan: "Đã xác nhận",
    processing: "Đang xử lý",
    dang_xu_ly: "Đang xử lý",
    shipping: "Đang giao hàng",
    dang_giao_hang: "Đang giao hàng",
    completed: "Hoàn tất",
    hoan_tat: "Hoàn tất",
    cancelled: "Đã hủy",
    da_huy: "Đã hủy",
  };

  return map[value || ""] || value || WAITING_CONFIRM_STATUS;
};

const paymentStatusLabel = (value?: string) => {
  const map: Record<string, string> = {
    pending: "Chưa thanh toán",
    failed: "Chưa thanh toán",
    refunded: "Chưa thanh toán",
    chua_thanh_toan: "Chưa thanh toán",
    paid: "Đã thanh toán",
    da_thanh_toan: "Đã thanh toán",
  };

  return map[value || ""] || value || "Chưa thanh toán";
};

const canCancelOrder = (orderStatus?: string) =>
  orderStatusLabel(orderStatus) === WAITING_CONFIRM_STATUS;

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cancellingId, setCancellingId] = useState("");
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

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get("/order");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openOrderDetail = (orderId: string) => {
    router.push({
      pathname: "/orderDetail",
      params: { id: orderId },
    });
  };

  const cancelOrder = async (orderId: string) => {
    try {
      setCancellingId(orderId);
      const res = await api.patch(`/order/${orderId}/cancel`);

      if (res.data?.success) {
        showNotice("Thành công", res.data.message || "Đã hủy đơn hàng");
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? { ...order, ...res.data.order } : order,
          ),
        );
      } else {
        showNotice("Lỗi", res.data?.message || "Không thể hủy đơn hàng");
      }
    } catch (err: any) {
      console.error(err);
      showNotice("Lỗi", err.response?.data?.message || "Không thể hủy đơn hàng");
    } finally {
      setCancellingId("");
    }
  };

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
          <View style={styles.card}>
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
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.detailBtn]}
                onPress={() => openOrderDetail(item._id)}
              >
                <Text style={styles.detailText}>Xem chi tiết đơn</Text>
              </TouchableOpacity>

              {canCancelOrder(item.orderStatus) ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.cancelBtn,
                    cancellingId === item._id && styles.actionBtnDisabled,
                  ]}
                  onPress={() => cancelOrder(item._id)}
                  disabled={cancellingId === item._id}
                >
                  <Text style={styles.cancelText}>
                    {cancellingId === item._id ? "Đang hủy..." : "Hủy đơn"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        }
      />

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
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBtn: {
    backgroundColor: "#d5001c",
  },
  detailText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancelBtn: {
    backgroundColor: "#fff",
    borderColor: "#d5001c",
    borderWidth: 1.5,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: "#d5001c",
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
