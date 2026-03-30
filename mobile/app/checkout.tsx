import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import AppToast from "../components/AppToast";
import AppBottomNav, { APP_BOTTOM_NAV_HEIGHT } from "../components/AppBottomNav";
import BackHeader from "../components/BackHeader";
import api from "../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

type CheckoutItem = {
  product: {
    _id: string;
    name: string;
    price: number;
    image: string | string[];
  };
  quantity: number;
};

type AddressItem = {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  isDefault?: boolean;
};

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    selected?: string;
    paymentStatus?: string;
    paymentMessage?: string;
    orderId?: string;
    directProductId?: string;
  }>();
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY">("COD");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [handledPaymentResult, setHandledPaymentResult] = useState(false);
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
    orderId: "",
  });

  const selectedProductIds = useMemo(() => {
    try {
      const raw = Array.isArray(params.selected) ? params.selected[0] : params.selected;
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, [params.selected]);

  const paymentStatus = Array.isArray(params.paymentStatus)
    ? params.paymentStatus[0]
    : params.paymentStatus;
  const paymentMessage = Array.isArray(params.paymentMessage)
    ? params.paymentMessage[0]
    : params.paymentMessage;
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const directProductId = Array.isArray(params.directProductId)
    ? params.directProductId[0]
    : params.directProductId;

  const showNotice = (title: string, message: string, nextOrderId = "") => {
    setNotice({
      visible: true,
      title,
      message,
      orderId: nextOrderId,
    });
  };

  const closeNotice = () => {
    const nextOrderId = notice.orderId;

    setNotice({
      visible: false,
      title: "",
      message: "",
      orderId: "",
    });

    if (nextOrderId) {
      router.replace("/tabs/orders");
    }
  };

  const getClientReturnUrl = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}/checkout`;
    }

    return Linking.createURL("/checkout");
  };

  useEffect(() => {
    if (handledPaymentResult || !paymentStatus) {
      return;
    }

    if (paymentStatus === "success") {
      showNotice("Thành công", paymentMessage || "Thanh toán online thành công", orderId);
    } else {
      showNotice("Lỗi", paymentMessage || "Thanh toán thất bại hoặc đã bị hủy");
    }

    setHandledPaymentResult(true);
  }, [handledPaymentResult, orderId, paymentMessage, paymentStatus]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const addressRes = await api.get("/address/list");
      const addressItems: AddressItem[] = addressRes.data || [];
      const defaultAddress =
        addressItems.find((item) => item.isDefault) || addressItems[0];

      setAddresses(addressItems);
      setSelectedAddressId(defaultAddress?._id || "");

      if (directProductId) {
        const productRes = await api.get(`/shop/product/${directProductId}`);
        const directProduct = productRes.data.product;

        setItems(
          directProduct
            ? [
                {
                  product: directProduct,
                  quantity: 1,
                },
              ]
            : [],
        );
      } else {
        const cartRes = await api.get("/cart");
        const cartItems: CheckoutItem[] = cartRes.data.items || [];
        const filteredItems = cartItems.filter((item) =>
          selectedProductIds.includes(item.product._id),
        );

        setItems(filteredItems);
      }

      if (addressItems.length === 0) {
        showNotice("Thông báo", "Vui lòng thêm địa chỉ mới để thanh toán");
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Không thể tải dữ liệu thanh toán");
    } finally {
      setLoading(false);
    }
  }, [directProductId, selectedProductIds]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const submitOrder = async () => {
    if (!items.length) {
      showNotice("Thông báo", "Không có sản phẩm nào để thanh toán");
      return;
    }

    if (!selectedAddressId) {
      showNotice("Thông báo", "Vui lòng thêm địa chỉ mới trước khi thanh toán");
      return;
    }

    try {
      setSubmitting(true);

      if (paymentMethod === "VNPAY") {
        const res = await api.post("/order/create-vnpay-payment", {
          addressId: selectedAddressId,
          selectedProductIds: directProductId ? [directProductId] : selectedProductIds,
          directProductIds: directProductId ? [directProductId] : [],
          clientReturnUrl: getClientReturnUrl(),
        });

        if (!res.data.success || !res.data.paymentUrl) {
          showNotice("Lỗi", res.data.message || "Không thể tạo thanh toán online");
          return;
        }

        const paymentUrl = res.data.paymentUrl as string;

        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.assign(paymentUrl);
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(
          paymentUrl,
          getClientReturnUrl(),
        );

        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const resultOrderId =
            typeof parsed.queryParams?.orderId === "string"
              ? parsed.queryParams.orderId
              : "";
          const resultMessage =
            typeof parsed.queryParams?.paymentMessage === "string"
              ? parsed.queryParams.paymentMessage
              : "";
          const resultStatus =
            typeof parsed.queryParams?.paymentStatus === "string"
              ? parsed.queryParams.paymentStatus
              : "";

          if (resultStatus === "success") {
            showNotice(
              "Thành công",
              resultMessage || "Thanh toán online thành công",
              resultOrderId,
            );
          } else {
            showNotice("Lỗi", resultMessage || "Thanh toán thất bại hoặc đã bị hủy");
          }
        } else if (result.type !== "cancel") {
          showNotice("Thông báo", "Bạn đã đóng phiên thanh toán online");
        }

        return;
      }

      const res = await api.post("/order/create", {
        addressId: selectedAddressId,
        paymentMethod,
        selectedProductIds: directProductId ? [directProductId] : selectedProductIds,
        directProductIds: directProductId ? [directProductId] : [],
      });

      if (res.data.success) {
        showNotice(
          "Thành công",
          "Đặt hàng thành công",
          res.data.order?._id || "done",
        );
      } else {
        showNotice("Lỗi", res.data.message || "Không thể tạo đơn hàng");
      }
    } catch (err: any) {
      console.error(err);
      showNotice("Lỗi", err.response?.data?.message || "Không thể xử lý thanh toán");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#d5001c" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <BackHeader title="Thanh toán" />

        <FlatList
          data={items}
          keyExtractor={(item) => item.product._id}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: APP_BOTTOM_NAV_HEIGHT + insets.bottom + 28 },
          ]}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>

              {addresses.length === 0 ? (
                <TouchableOpacity
                  style={styles.addAddressBtn}
                  onPress={() => router.push("/tabs/addressAdd")}
                >
                  <Text style={styles.addAddressText}>+ Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              ) : (
                addresses.map((address) => {
                  const isActive = selectedAddressId === address._id;

                  return (
                    <TouchableOpacity
                      key={address._id}
                      style={[styles.addressCard, isActive && styles.addressCardActive]}
                      onPress={() => setSelectedAddressId(address._id)}
                    >
                      <Text style={styles.addressName}>
                        {address.fullName} | {address.phone}
                      </Text>
                      <Text style={styles.addressText}>
                        {address.address}, {address.city}
                      </Text>
                      {address.isDefault ? (
                        <Text style={styles.defaultBadge}>Mặc định</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={styles.sectionTitle}>Sản phẩm đã chọn</Text>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemMeta}>Số lượng: {item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {(item.product.price * item.quantity).toLocaleString("vi-VN")} VND
              </Text>
            </View>
          )}
          ListFooterComponent={
            <>
              <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>

              <View style={styles.paymentRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "COD" && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMethod("COD")}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      paymentMethod === "COD" && styles.paymentTextActive,
                    ]}
                  >
                    Thanh toán khi nhận hàng
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "VNPAY" && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMethod("VNPAY")}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      paymentMethod === "VNPAY" && styles.paymentTextActive,
                    ]}
                  >
                    Thanh toán online
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
                <Text style={styles.summaryValue}>
                  {totalPrice.toLocaleString("vi-VN")} VND
                </Text>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={submitOrder}
                  disabled={submitting}
                >
                  <Text style={styles.submitText}>
                    {submitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          }
        />
      </View>

      <AppBottomNav active="cart" />

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
    paddingBottom: APP_BOTTOM_NAV_HEIGHT + 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    marginTop: 4,
  },
  addAddressBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  addAddressText: {
    color: "#d5001c",
    fontWeight: "700",
  },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  addressCardActive: {
    borderColor: "#d5001c",
  },
  addressName: {
    color: "#111",
    fontWeight: "700",
  },
  addressText: {
    color: "#666",
    marginTop: 6,
  },
  defaultBadge: {
    color: "#d5001c",
    fontWeight: "700",
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  itemName: {
    color: "#111",
    fontWeight: "600",
    fontSize: 15,
  },
  itemMeta: {
    color: "#666",
    marginTop: 6,
  },
  itemPrice: {
    color: "#d5001c",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  paymentRow: {
    gap: 10,
  },
  paymentOption: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  paymentOptionActive: {
    borderColor: "#d5001c",
    backgroundColor: "#fff5f5",
  },
  paymentText: {
    color: "#333",
    fontWeight: "600",
  },
  paymentTextActive: {
    color: "#d5001c",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  summaryLabel: {
    color: "#666",
    fontSize: 15,
  },
  summaryValue: {
    color: "#d5001c",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: "#d5001c",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: {
    backgroundColor: "#f3a3ad",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
