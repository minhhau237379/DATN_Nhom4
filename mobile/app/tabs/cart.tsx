import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import api from "../../services/api";
import BackHeader from "../../components/BackHeader";
import AppToast from "../../components/AppToast";

import { isLoggedIn } from "../../utils/auth";
import { resolveImageUri } from "../../utils/productImage";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string | string[];
  stock?: number;
  status?: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function Cart() {
  const params = useLocalSearchParams<{ selectedProductId?: string }>();
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
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

  const loadCart = useCallback(async () => {
    try {
      const res = await api.get("/cart");
      const data = res.data;

      if (data.success) {
        const items = (data.items || []).filter(
          (cartItem: CartItem) => cartItem.product && cartItem.product.status !== 0,
        );
        setCartItems(items);
        setQuantityInputs(
          items.reduce(
            (acc: Record<string, string>, cartItem: CartItem) => {
              acc[cartItem.product._id] = String(cartItem.quantity);
              return acc;
            },
            {},
          ),
        );
        setSelectedProductIds((prev) =>
          prev.filter((id) =>
            items.some((cartItem: CartItem) => cartItem.product._id === id),
          ),
        );
      } else {
        setCartItems([]);
        setQuantityInputs({});
        setSelectedProductIds([]);
      }
    } catch (err) {
      console.error("Load cart error:", err);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const selectedProductId = Array.isArray(params.selectedProductId)
      ? params.selectedProductId[0]
      : params.selectedProductId;

    if (!selectedProductId) return;

    setSelectedProductIds((prev) =>
      prev.includes(selectedProductId) ? prev : [...prev, selectedProductId],
    );
  }, [params.selectedProductId]);

  useFocusEffect(
    useCallback(() => {
      const guardAndLoad = async () => {
        if (!(await isLoggedIn())) {
          router.replace({
            pathname: "/need-login",
            params: { feature: "cart" },
          });
          return;
        }

        loadCart();
      };

      guardAndLoad();
    }, [loadCart]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      void loadCart();
    });

    return unsubscribe;
  }, [navigation, loadCart]);

  const refreshCart = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadCart();
    } finally {
      setRefreshing(false);
    }
  }, [loadCart]);

  const updateQty = async (productId: string, change: number) => {
    try {
      const res = await api.post("/cart/update", {
        productId,
        change,
      });

      if (res.data.success) {
        loadCart();
      } else if (res.data.message) {
        showNotice("Thông báo", res.data.message);
      } else {
        showNotice("Thông báo", "Không thể cập nhật số lượng");
      }
    } catch (err) {
      console.error("Update cart error:", err);
      showNotice("Lỗi", "Có lỗi xảy ra khi cập nhật số lượng");
    }
  };

  const submitQuantity = async (productId: string) => {
    const item = cartItems.find((cartItem) => cartItem.product._id === productId);
    const rawValue = quantityInputs[productId]?.trim() ?? "";

    if (!item) {
      return;
    }

    if (!rawValue) {
      setQuantityInputs((prev) => ({
        ...prev,
        [productId]: String(item.quantity),
      }));
      showNotice("Thông báo", "Vui lòng nhập số lượng");
      return;
    }

    const nextQuantity = Number(rawValue);

    if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
      setQuantityInputs((prev) => ({
        ...prev,
        [productId]: String(item.quantity),
      }));
      showNotice("Thông báo", "Số lượng phải là số nguyên lớn hơn 0");
      return;
    }

    if (nextQuantity === item.quantity) {
      setQuantityInputs((prev) => ({
        ...prev,
        [productId]: String(item.quantity),
      }));
      return;
    }

    await updateQty(productId, nextQuantity - item.quantity);
  };

  const deleteItem = async (productId: string) => {
    try {
      const res = await api.post("/cart/delete", {
        productId,
      });

      if (res.data.success) {
        setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
        loadCart();
      }
    } catch (err) {
      console.error("Delete cart error:", err);
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const selectedTotalPrice = cartItems.reduce((sum, item) => {
    if (!selectedProductIds.includes(item.product._id)) {
      return sum;
    }

    return sum + item.product.price * item.quantity;
  }, 0);

  const checkout = async () => {
    try {
      const res = await api.get("/address/list");

      if (res.data.length === 0) {
        showNotice("Thông báo", "Vui lòng thêm địa chỉ mới để tiếp tục thanh toán");
        setTimeout(() => {
          router.push("/tabs/addressAdd" as any);
        }, 300);
        return;
      }

      router.push({
        pathname: "/checkout" as any,
        params: {
          selected: JSON.stringify(selectedProductIds),
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View
      style={[
        styles.item,
        selectedProductIds.includes(item.product._id) && styles.itemSelected,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          selectedProductIds.includes(item.product._id) && styles.checkboxActive,
        ]}
        onPress={() => toggleSelectProduct(item.product._id)}
      >
        <Text style={styles.checkboxIcon}>
          {selectedProductIds.includes(item.product._id) ? "✓" : ""}
        </Text>
      </TouchableOpacity>

      <Image
        source={{ uri: resolveImageUri(item.product.image) }}
        style={styles.image}
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.product.name}
        </Text>

        <Text style={styles.price}>
          {item.product.price.toLocaleString("vi-VN")} VND
        </Text>

        <View style={styles.qtyBox}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQty(item.product._id, -1)}
          >
            <Ionicons name="remove" size={18} color="#fff" />
          </TouchableOpacity>

          <TextInput
            style={styles.qtyInput}
            value={quantityInputs[item.product._id] ?? String(item.quantity)}
            onChangeText={(value) =>
              setQuantityInputs((prev) => ({
                ...prev,
                [item.product._id]: value.replace(/[^0-9]/g, ""),
              }))
            }
            onBlur={() => submitQuantity(item.product._id)}
            onSubmitEditing={() => submitQuantity(item.product._id)}
            keyboardType="number-pad"
            returnKeyType="done"
            textAlign="center"
          />

          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQty(item.product._id, 1)}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(item.product._id)}>
            <Ionicons name="trash-outline" size={18} color="#d5001c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCheckoutBar = () => (
    <View style={[styles.checkoutBarWrap, { bottom: tabBarHeight + 2 }]}>
      <View style={styles.checkoutBar}>
        <Text style={styles.totalLabel}>
          Tổng tiền:{" "}
          <Text style={styles.total}>
            {selectedTotalPrice.toLocaleString("vi-VN")} VND
          </Text>
        </Text>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            selectedProductIds.length > 0 && styles.checkoutBtnActive,
            selectedProductIds.length === 0 && styles.checkoutBtnDisabled,
          ]}
          onPress={checkout}
          disabled={selectedProductIds.length === 0}
        >
          <Text style={styles.checkoutText}>Mua hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <BackHeader title="Giỏ hàng" showBack={false} />
      </View>

      {cartItems.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={(_, index) => String(index)}
          renderItem={null}
          style={styles.list}
          contentContainerStyle={styles.emptyListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshCart} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Giỏ hàng trống</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.listArea}>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.product._id}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              {
                flexGrow: 1,
                paddingBottom: 180,
              },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refreshCart} />
            }
          />

          {renderCheckoutBar()}
        </View>
      )}

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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  list: {
    flex: 1,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  checkoutBarWrap: {
    position: "absolute",
    left: 8,
    right: 8,
  },
  item: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  itemSelected: {
    borderWidth: 1.5,
    borderColor: "#e30019",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cfcfcf",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  checkboxActive: {
    backgroundColor: "#e30019",
    borderColor: "#e30019",
  },
  checkboxIcon: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  image: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
  },
  price: {
    color: "#d5001c",
    fontWeight: "700",
    fontSize: 20,
    marginTop: 6,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNumber: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 16,
    color: "#111",
  },
  qtyInput: {
    minWidth: 48,
    height: 34,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    fontSize: 16,
    color: "#111",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f3",
  },
  checkoutBar: {
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 14,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  totalLabel: {
    color: "#333",
    fontSize: 15,
  },
  total: {
    color: "#d5001c",
    fontSize: 18,
    fontWeight: "700",
  },
  checkoutBtn: {
    marginTop: 10,
    backgroundColor: "#f0a3b0",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  checkoutBtnActive: {
    backgroundColor: "#e30019",
  },
  checkoutBtnDisabled: {
    backgroundColor: "#f3a3ad",
  },
  checkoutText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyText: {
    color: "#d5001c",
    fontSize: 18,
    fontWeight: "600",
  },
});
