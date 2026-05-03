import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import AppDialog from "../components/AppDialog";
import AppToast from "../components/AppToast";
import AppBottomNav, {
  APP_BOTTOM_NAV_HEIGHT,
  resolveNavSafeAreaBottom,
} from "../components/AppBottomNav";
import BackHeader from "../components/BackHeader";
import api from "../services/api";
import { resolveImageUri } from "../utils/productImage";
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

type AppliedVoucher = {
  code: string;
  discountAmount: number;
  totalPrice: number;
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
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [handledPaymentResult, setHandledPaymentResult] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = resolveNavSafeAreaBottom(insets.bottom);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
    orderId: "",
  });
  const [successDialog, setSuccessDialog] = useState({
    visible: false,
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

  const showOrderSuccessDialog = (nextOrderId = "") => {
    setSuccessDialog({
      visible: true,
      orderId: nextOrderId,
    });
  };

  const continueShopping = () => {
    setSuccessDialog({ visible: false, orderId: "" });
    router.replace("/tabs/product");
  };

  const goToMyOrders = () => {
    setSuccessDialog({ visible: false, orderId: "" });
    router.replace("/tabs/orders");
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
      showOrderSuccessDialog(orderId || "");
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
  const discountAmount = appliedVoucher?.discountAmount || 0;
  const finalTotalPrice = Math.max(totalPrice - discountAmount, 0);

  const applyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();

    if (!code) {
      showNotice("Thông báo", "Vui lòng nhập mã voucher");
      return;
    }

    if (totalPrice <= 0) {
      showNotice("Thông báo", "Không có sản phẩm nào để áp dụng voucher");
      return;
    }

    try {
      setApplyingVoucher(true);
      const res = await api.post("/order/vouchers/validate", {
        code,
        subtotal: totalPrice,
      });

      setAppliedVoucher({
        code: res.data.voucher?.code || code,
        discountAmount: Number(res.data.discountAmount || 0),
        totalPrice: Number(res.data.totalPrice || 0),
      });
      setVoucherCode(res.data.voucher?.code || code);
      showNotice("Thành công", "Đã áp dụng voucher");
    } catch (err: any) {
      setAppliedVoucher(null);
      showNotice("Lỗi", err.response?.data?.message || "Voucher không hợp lệ");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
  };

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
          voucherCode: appliedVoucher?.code || "",
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
            showOrderSuccessDialog(resultOrderId);
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
        voucherCode: appliedVoucher?.code || "",
      });

      if (res.data.success) {
        showOrderSuccessDialog(res.data.order?._id || "");
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
        <BackHeader title="Thanh toán" onBack={() => router.replace("/tabs/cart")} />

        <FlatList
          data={items}
          keyExtractor={(item) => item.product._id}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: APP_BOTTOM_NAV_HEIGHT + safeBottom + 28 },
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
              <Image
                source={{ uri: resolveImageUri(item.product.image) }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemMeta}>Số lượng: {item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  {(item.product.price * item.quantity).toLocaleString("vi-VN")} VND
                </Text>
              </View>
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

              {/* <Text style={styles.sectionTitle}>Voucher</Text>

              <View style={styles.voucherCard}>
                <View style={styles.voucherRow}>
                  <TextInput
                    style={styles.voucherInput}
                    value={voucherCode}
                    onChangeText={(value) => {
                      setVoucherCode(value.toUpperCase());
                      if (appliedVoucher) {
                        setAppliedVoucher(null);
                      }
                    }}
                    placeholder="Nhập mã voucher"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      styles.voucherBtn,
                      applyingVoucher && styles.voucherBtnDisabled,
                    ]}
                    onPress={applyVoucher}
                    disabled={applyingVoucher}
                  >
                    <Text style={styles.voucherBtnText}>
                      {applyingVoucher ? "Đang áp dụng" : "Áp dụng"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {appliedVoucher ? (
                  <View style={styles.appliedVoucherBox}>
                    <Text style={styles.appliedVoucherText}>
                      Đã áp dụng {appliedVoucher.code}
                    </Text>
                    <TouchableOpacity onPress={removeVoucher}>
                      <Text style={styles.removeVoucherText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View> */}

              <View style={styles.summaryCard}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Tạm tính</Text>
                  <Text style={styles.summaryText}>
                    {totalPrice.toLocaleString("vi-VN")} VND
                  </Text>
                </View>
                {discountAmount > 0 ? (
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Voucher</Text>
                    <Text style={styles.discountText}>
                      -{discountAmount.toLocaleString("vi-VN")} VND
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
                <Text style={styles.summaryValue}>
                  {finalTotalPrice.toLocaleString("vi-VN")} VND
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

      <AppDialog
        visible={successDialog.visible}
        title="Đặt hàng thành công"
        message="Đơn hàng của bạn đã được tạo thành công."
        cancelText="Tiếp tục mua sắm"
        confirmText="Đơn hàng của tôi"
        onClose={continueShopping}
        onConfirm={goToMyOrders}
      />

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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    resizeMode: "cover",
  },
  itemInfo: {
    flex: 1,
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
  voucherCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  voucherRow: {
    flexDirection: "row",
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#111",
    fontWeight: "700",
  },
  voucherBtn: {
    minWidth: 92,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#d5001c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  voucherBtnDisabled: {
    opacity: 0.6,
  },
  voucherBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  appliedVoucherBox: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#fff5f5",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appliedVoucherText: {
    color: "#d5001c",
    fontWeight: "700",
  },
  removeVoucherText: {
    color: "#333",
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#666",
    fontSize: 15,
  },
  summaryText: {
    color: "#111",
    fontWeight: "700",
  },
  discountText: {
    color: "#d5001c",
    fontWeight: "700",
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
