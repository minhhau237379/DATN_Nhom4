import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { isAxiosError } from "axios";
import AppToast from "../../components/AppToast";
import api from "../../services/api";
import { isLoggedIn } from "../../utils/auth";
import { resolveImageUri } from "../../utils/productImage";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string | string[];
};

type Category = {
  _id: string;
  name: string;
};

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceDialogVisible, setPriceDialogVisible] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const loadFavorites = useCallback(async () => {
    try {
      if (!(await isLoggedIn())) {
        setFavorites([]);
        return;
      }

      const res = await api.get("/favorite/list");
      setFavorites(res.data.favorites || []);
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const code = err.response?.data?.code;

        if (status === 401 || status === 403 || code === "ACCOUNT_LOCKED") {
          return;
        }
      }

      console.error(err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/shop", {
        params: { search: debouncedSearch, sort, category, minPrice, maxPrice },
      });

      setProducts(res.data.products);
      setCategories(res.data.categories);
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const code = err.response?.data?.code;

        if (status === 401 || status === 403 || code === "ACCOUNT_LOCKED") {
          return;
        }
      }

      console.error(err);
    }
  }, [debouncedSearch, sort, category, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
    loadFavorites();
  }, [fetchProducts, loadFavorites]);

  const refreshProducts = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([fetchProducts(), loadFavorites()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts, loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  const toggleFav = async (id: string) => {
    try {
      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để sử dụng tính năng này");
        return;
      }

      const res = await api.post(`/favorite/toggle/${id}`);

      if (res.data.success) {
        setFavorites((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const code = err.response?.data?.code;

        if (status === 401 || status === 403 || code === "ACCOUNT_LOCKED") {
          return;
        }
      }

      console.error(err);
    }
  };

  const toggleSort = (nextSort: string) => {
    setSort((prev) => (prev === nextSort ? "" : nextSort));
  };

  const openPriceDialog = () => {
    setPriceDraft({
      min: minPrice,
      max: maxPrice,
    });
    setPriceDialogVisible(true);
  };

  const closePriceDialog = () => {
    setPriceDialogVisible(false);
  };

  const applyPriceFilter = () => {
    const min = priceDraft.min.trim();
    const max = priceDraft.max.trim();

    if (!min && !max) {
      setMinPrice("");
      setMaxPrice("");
      closePriceDialog();
      return;
    }

    if (!min || !max) {
      showNotice("Lọc giá", "Vui lòng nhập cả giá từ và giá đến");
      return;
    }

    const minNumber = Number(min);
    const maxNumber = Number(max);

    if (Number.isNaN(minNumber) || Number.isNaN(maxNumber) || minNumber < 0 || maxNumber < 0) {
      showNotice("Lọc giá", "Khoảng giá không hợp lệ");
      return;
    }

    if (minNumber > maxNumber) {
      closePriceDialog();
      showNotice("Lọc giá", "Giá từ phải nhỏ hơn hoặc bằng giá đến");
      return;
    }

    setMinPrice(String(minNumber));
    setMaxPrice(String(maxNumber));
    closePriceDialog();
  };

  const clearPriceFilter = () => {
    setPriceDraft({ min: "", max: "" });
    setMinPrice("");
    setMaxPrice("");
    closePriceDialog();
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/tabs/productDetail",
          params: { id: item._id },
        })
      }
    >
      <Image source={{ uri: resolveImageUri(item.image) }} style={styles.image} />

      <Text style={styles.title} numberOfLines={2}>
        {item.name}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.price}>{item.price.toLocaleString("vi-VN")} VND</Text>

        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.heartButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFav(item._id);
          }}
        >
          <Ionicons
            name={favorites.includes(item._id) ? "heart" : "heart-outline"}
            size={28}
            color={favorites.includes(item._id) ? "#ff2d55" : "#bbb"}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            placeholderTextColor="#000"
            placeholder="Nhập từ khóa ..."
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>

        <View style={styles.filtersPanel}>
          <View style={styles.sortRow}>
            <TouchableOpacity onPress={() => toggleSort("price_asc")}>
              <Text
                style={[styles.sortBtn, sort === "price_asc" && styles.sortActive]}
              >
                Giá ↑
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleSort("price_desc")}>
              <Text
                style={[styles.sortBtn, sort === "price_desc" && styles.sortActive]}
              >
                Giá ↓
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={openPriceDialog}>
              <Text
                style={[
                  styles.sortBtn,
                  (minPrice || maxPrice) && styles.sortActive,
                  styles.priceFilterBtn,
                ]}
              >
                Lọc giá
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={[{ _id: "all", name: "Tất cả" }, ...categories]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => {
              const isActive =
                item._id === "all" ? category === "" : category === item.name;

              return (
                <TouchableOpacity
                  onPress={() => setCategory(item._id === "all" ? "" : item.name)}
                >
                  <Text style={[styles.category, isActive && styles.categoryActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={refreshProducts}
        />
      </View>

      <Modal
        visible={priceDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={closePriceDialog}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "position" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 20}
            style={styles.modalKeyboardWrap}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Lọc theo khoảng giá</Text>
              <Text style={styles.modalDesc}>Nhập giá từ và giá đến để lọc sản phẩm.</Text>

              <View style={styles.modalFields}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Giá từ</Text>
                  <TextInput
                    value={priceDraft.min}
                    onChangeText={(text) =>
                      setPriceDraft((prev) => ({ ...prev, min: text.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                    placeholder="Ví dụ: 100000"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Giá đến</Text>
                  <TextInput
                    value={priceDraft.max}
                    onChangeText={(text) =>
                      setPriceDraft((prev) => ({ ...prev, max: text.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                    placeholder="Ví dụ: 500000"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={clearPriceFilter}>
                  <Text style={styles.modalSecondaryText}>Xóa lọc</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={applyPriceFilter}>
                  <Text style={styles.modalPrimaryText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#d5001c",
    paddingHorizontal: 10,
    paddingTop: Platform.OS === "ios" ? 18 : 12,
    paddingBottom: 12,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 40,
  },
  filtersPanel: {
    backgroundColor: "#f5f5f5",
    paddingBottom: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  sortBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  priceFilterBtn: {
    minWidth: 72,
    textAlign: "center",
  },
  sortActive: {
    backgroundColor: "black",
    color: "white",
  },
  categoryList: {
    paddingHorizontal: 10,
    gap: 10,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: "center",
  },
  category: {
    backgroundColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  categoryActive: {
    backgroundColor: "black",
    color: "white",
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 116,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    minHeight: 220,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
  },
  title: {
    fontSize: 14,
    marginTop: 8,
    color: "#111",
    minHeight: 42,
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    color: "red",
    fontWeight: "bold",
    flex: 1,
    fontSize: 17,
  },
  heartButton: {
    paddingLeft: 8,
    paddingTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  modalKeyboardWrap: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  modalDesc: {
    marginTop: 6,
    color: "#666",
    lineHeight: 20,
  },
  modalFields: {
    gap: 12,
    marginTop: 16,
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: "#eee",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: "#333",
    fontWeight: "700",
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: "#d5001c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
});



