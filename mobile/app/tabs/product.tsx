import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AppToast from "../../components/AppToast";
import api from "../../services/api";
import { isLoggedIn } from "../../utils/auth";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
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
  const [sort, setSort] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
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

  const loadFavorites = useCallback(async () => {
    try {
      if (!(await isLoggedIn())) {
        setFavorites([]);
        return;
      }

      const res = await api.get("/favorite/list");
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/shop", {
        params: { search, sort, category, minPrice, maxPrice },
      });

      setProducts(res.data.products);
      setCategories(res.data.categories);
    } catch (err) {
      console.error(err);
    }
  }, [search, sort, category, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
    loadFavorites();
  }, [fetchProducts, loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  const toggleFav = async (id: string) => {
    try {
      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để sử dụng yêu thích");
        return;
      }

      const res = await api.post(`/favorite/toggle/${id}`);

      if (res.data.success) {
        setFavorites((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSort = (nextSort: string) => {
    setSort((prev) => (prev === nextSort ? "" : nextSort));
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
      <Image
        source={{ uri: `http://localhost:3003${item.image}` }}
        style={styles.image}
      />

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
          <Text
            style={[
              styles.heart,
              favorites.includes(item._id) && styles.heartActive,
            ]}
          >
            ♥
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            placeholder="Nhập từ khóa..."
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>

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
                <Text
                  style={[styles.category, isActive && styles.categoryActive]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      </View>

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
    padding: 10,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 40,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
  },
  sortBtn: {
    backgroundColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sortActive: {
    backgroundColor: "black",
    color: "white",
  },
  categoryList: {
    paddingHorizontal: 10,
    gap: 10,
    paddingBottom: 12,
    marginBottom: 100,
  },
  category: {
    backgroundColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    
  },
  categoryActive: {
    backgroundColor: "black",
    color: "white",
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 96,
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
  heart: {
    fontSize: 26,
    color: "#bbb",
  },
  heartButton: {
    paddingLeft: 8,
    paddingTop: 4,
  },
  heartActive: {
    color: "#ff2d55",
  },
});
