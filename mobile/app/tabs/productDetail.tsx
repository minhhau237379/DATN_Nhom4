import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AppToast from "../../components/AppToast";
import api from "../../services/api";
import { isLoggedIn } from "../../utils/auth";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  stock?: number;
  description?: string;
  specifications?: Record<string, string>;
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
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
    if (!id) return;

    const loadData = async () => {
      try {
        const productRes = await api.get(`/shop/product/${id}`);
        setProduct(productRes.data.product);
        setRelatedProducts(productRes.data.relatedProducts || []);

        if (await isLoggedIn()) {
          const favRes = await api.get("/favorite/list");
          setIsFavorite(favRes.data.favorites.includes(id));
        } else {
          setIsFavorite(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [id]);

  const toggleFav = async (productId: string) => {
    try {
      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để sử dụng yêu thích");
        return;
      }

      const res = await api.post(`/favorite/toggle/${productId}`);

      if (res.data.success) {
        setIsFavorite(res.data.isFavorite);
        showNotice("Thông báo", "Đã cập nhật yêu thích");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        showNotice("Lỗi", "Bạn cần đăng nhập");
      } else {
        showNotice("Lỗi", "Có lỗi xảy ra");
      }
    }
  };

  const addToCart = async (productId: string) => {
    try {
      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để sử dụng giỏ hàng");
        return;
      }

      const res = await api.post("/cart/add", { productId });

      if (res.data.success) {
        showNotice("Thành công", "Đã thêm vào giỏ hàng");
      } else {
        showNotice(
          "Thông báo",
          res.data.message || "Không thể thêm vào giỏ hàng",
        );
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Có lỗi xảy ra");
    }
  };

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const isOutOfStock = (product.stock || 0) <= 0;

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.imageBox}>
          <Image
            source={{ uri: `http://localhost:3003${product.image}` }}
            style={styles.image}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {product.price.toLocaleString("vi-VN")} VND
            </Text>

            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.favoriteButton}
              onPress={() => toggleFav(product._id)}
            >
              <Text
                style={[
                  styles.favoriteIcon,
                  isFavorite && styles.favoriteIconActive,
                ]}
              >
                {isFavorite ? "♥" : "♡"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={isOutOfStock ? styles.outOfStock : styles.inStock}>
            {isOutOfStock ? "Hết hàng" : `Còn hàng: ${product.stock ?? 0}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, isOutOfStock && styles.btnDisabled]}
          onPress={() => addToCart(product._id)}
          disabled={isOutOfStock}
        >
          <Text style={styles.btnText}>
            {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.title}>Mô tả sản phẩm</Text>

          <Text style={styles.desc}>
            {product.description || "Chưa có thông tin"}
          </Text>

          {product.specifications &&
            Object.keys(product.specifications).map((key) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{key}</Text>
                <Text>{product.specifications?.[key]}</Text>
              </View>
            ))}
        </View>

        <View style={styles.related}>
          {relatedProducts.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.relatedCard}
              onPress={() =>
                router.push({
                  pathname: "/tabs/productDetail",
                  params: { id: item._id },
                })
              }
            >
              <Image
                source={{ uri: `http://localhost:3003${item.image}` }}
                style={styles.relatedImage}
              />
              <Text numberOfLines={2}>{item.name}</Text>
              <Text style={styles.price}>
                {item.price.toLocaleString("vi-VN")} VND
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageBox: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    margin: 10,
  },
  image: {
    width: "100%",
    height: 250,
    resizeMode: "contain",
  },
  section: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 15,
  },
  name: { fontSize: 16, fontWeight: "500" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
  },
  price: { color: "red", fontWeight: "bold", fontSize: 18 },
  favoriteButton: {
    padding: 4,
    marginRight: -4,
    marginTop: -4,
  },
  favoriteIcon: {
    fontSize: 32,
    color: "#9b9b9b",
  },
  favoriteIconActive: {
    color: "#ff2d55",
  },
  inStock: {
    marginTop: 10,
    color: "#2e7d32",
    fontWeight: "700",
  },
  outOfStock: {
    marginTop: 10,
    color: "#d5001c",
    fontWeight: "700",
  },
  btn: {
    backgroundColor: "#d5001c",
    margin: 10,
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#bdbdbd",
  },
  btnText: { color: "white", fontWeight: "bold" },
  title: { fontWeight: "bold", marginBottom: 5 },
  desc: { marginBottom: 10 },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 5,
  },
  specKey: { fontWeight: "600" },
  related: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    gap: 10,
  },
  relatedCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
  },
  relatedImage: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
  },
});
