import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHTML from "react-native-render-html";
import BackHeader from "../../components/BackHeader";
import AppToast from "../../components/AppToast";
import api from "../../services/api";
import { createProductAttachment, sendChatMessage } from "../../services/chat";
import { isLoggedIn } from "../../utils/auth";
import { getProductImages, resolveImageUri } from "../../utils/productImage";

const { width: screenWidth } = Dimensions.get("window");

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string | string[];
  stock?: number;
  description?: string;
  specifications?: Record<string, string>;
};

const specLabelMap: Record<string, string> = {
  brand: "Thương hiệu",
  character: "Nhân vật",
  age: "Độ tuổi",
  material: "Chất liệu",
  height: "Kích thước",
  origin: "Xuất xứ",
  theme: "Chủ đề",
};

const descriptionFieldKeyMap: Record<string, string> = {
  "Chủ đề": "theme",
  "Độ tuổi": "age",
  "Giới tính": "gender",
  "Thương hiệu": "brand",
  "Xuất xứ": "origin",
};

const formatSpecLabel = (key: string) => specLabelMap[key] || key;

const extractDescriptionFields = (html?: string) => {
  if (!html) return [] as { label: string; value: string }[];

  const matches = Array.from(
    html.matchAll(/<p>\s*<strong>([^<:]+):<\/strong>\s*([\s\S]*?)<\/p>/gi),
  );

  const parsed = matches
    .map(([, label, value]) => ({
      label: String(label).trim(),
      value: String(value)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim(),
    }))
    .filter((item) => item.label && item.value);

  if (parsed.length) return parsed;

  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? [{ label: "Mô tả", value: text }] : [];
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageListRef = useRef<FlatList<string> | null>(null);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const { width: contentWidth } = useWindowDimensions();

  const showNotice = (title: string, message: string) => {
    setNotice({ visible: true, title, message });
  };

  const closeNotice = () => {
    setNotice({ visible: false, title: "", message: "" });
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
        showNotice("Thông báo", res.data.message || "Không thể thêm vào giỏ hàng");
      }
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Có lỗi xảy ra");
    }
  };

  const chatWithAdmin = async () => {
    try {
      if (!product) {
        return;
      }

      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để chat với admin");
        return;
      }

      const attachment = createProductAttachment({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: productImages[0] || "",
      });

      await sendChatMessage({
        content: `Mình muốn hỏi về sản phẩm: ${product.name}`,
        attachment,
      });

      router.push("/tabs/chat");
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Không thể gửi sản phẩm sang chat");
    }
  };

  const buyNow = async (productId: string) => {
    try {
      if (!(await isLoggedIn())) {
        showNotice("Thông báo", "Bạn cần đăng nhập để mua hàng");
        return;
      }

      router.push({
        pathname: "/checkout" as any,
        params: {
          directProductId: productId,
        },
      });
    } catch (err) {
      console.error(err);
      showNotice("Lỗi", "Không thể mở trang thanh toán");
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
  const productImages = getProductImages(product.image);
  const descriptionFields = extractDescriptionFields(product.description);
  const descriptionKeys = new Set(
    descriptionFields.map((field) => descriptionFieldKeyMap[field.label] || field.label),
  );
  const specEntries =
    product.specifications &&
    Object.entries(product.specifications).filter(([key, value]) => {
      const normalizedValue = String(value ?? "").trim();
      return normalizedValue && !descriptionKeys.has(key);
    });

  const hasSpecs = Boolean(specEntries && specEntries.length > 0);
  const hasDesc = Boolean(product.description?.trim());
  const hasInfoImages = productImages.length > 0;
  const leadInfoImage = hasInfoImages ? productImages[0] : null;
  const restInfoImages = hasInfoImages ? productImages.slice(1) : [];

  const slideWidth = screenWidth - 20;
  const slideGap = 6;
  const slideInterval = slideWidth + slideGap;

  return (
    <>
      <ScrollView style={styles.container}>
        <BackHeader
          title="Chi tiết sản phẩm"
          backgroundColor="#fff"
          titleColor="#111"
          iconColor="#111"
          containerStyle={styles.headerBack}
        />

        <View style={styles.imageBox}>
          <FlatList
            ref={imageListRef}
            data={productImages.length ? productImages : [""]}
            horizontal
            pagingEnabled
            disableIntervalMomentum
            snapToInterval={slideInterval}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item || "image"}-${index}`}
            getItemLayout={(_, index) => ({
              length: slideInterval,
              offset: slideInterval * index,
              index,
            })}
            scrollEventThrottle={16}
            onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideInterval);
              setActiveImageIndex(nextIndex);
            }}
            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideInterval);
              setActiveImageIndex(nextIndex);
            }}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.slide,
                  {
                    width: slideWidth,
                    marginRight: index === productImages.length - 1 ? 0 : slideGap,
                  },
                ]}
              >
                <Image source={{ uri: resolveImageUri(item) }} style={styles.image} />
              </View>
            )}
          />

          {productImages.length > 1 ? (
            <View style={styles.dots}>
              {productImages.map((image, index) => (
                <View
                  key={`${image}-${index}`}
                  style={[styles.dot, index === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}

          {productImages.length > 1 ? (
            <View style={styles.thumbRow}>
              {productImages.map((image, index) => (
                <TouchableOpacity
                  key={`${image}-thumb-${index}`}
                  style={[styles.thumbItem, index === activeImageIndex && styles.thumbActive]}
                  onPress={() => {
                    setActiveImageIndex(index);
                    imageListRef.current?.scrollToIndex({ index, animated: true });
                  }}
                >
                  <Image source={{ uri: resolveImageUri(image) }} style={styles.thumbImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
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
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={30}
                color={isFavorite ? "#ff2d55" : "#9b9b9b"}
              />
            </TouchableOpacity>
          </View>

          <Text style={isOutOfStock ? styles.outOfStock : styles.inStock}>
            {isOutOfStock ? "Hết hàng" : `Còn hàng: ${product.stock ?? 0}`}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.buyNowBtn, isOutOfStock && styles.btnDisabled]}
            onPress={() => buyNow(product._id)}
            disabled={isOutOfStock}
          >
            <Text style={styles.buyNowText}>
              {isOutOfStock ? "Hết hàng" : "Mua ngay"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.cartBtn, isOutOfStock && styles.btnDisabled]}
            onPress={() => addToCart(product._id)}
            disabled={isOutOfStock}
          >
            <Text style={styles.cartBtnText}>
              {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={chatWithAdmin}
        >
          <Ionicons name="chatbox-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Chat với admin</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.title}>Thông tin sản phẩm</Text>

          {hasSpecs &&
            specEntries!.map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{formatSpecLabel(key)}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}

          {leadInfoImage ? (
            <Image
              source={{ uri: resolveImageUri(leadInfoImage) }}
              style={[
                styles.descriptionGalleryImage,
                styles.infoLeadImage,
                hasSpecs ? styles.infoLeadImageAfterSpecs : null,
              ]}
            />
          ) : null}

          {hasDesc ? (
            <View style={styles.descriptionBodyPanel}>
              <RenderHTML
                contentWidth={contentWidth - 52}
                source={{ html: product.description! }}
                baseStyle={styles.descriptionBody}
                tagsStyles={{
                  h1: styles.renderHeading,
                  h2: styles.renderHeading,
                  h3: styles.renderHeading,
                  h4: styles.renderHeading,
                  p: styles.renderParagraph,
                  ul: styles.renderList,
                  ol: styles.renderList,
                  li: styles.renderListItem,
                  blockquote: styles.renderQuote,
                  strong: styles.renderStrong,
                  th: styles.renderCell,
                  td: styles.renderCell,
                }}
              />
            </View>
          ) : null}

          {restInfoImages.length > 0 ? (
            <View style={styles.descriptionGallery}>
              {restInfoImages.map((uri, index) => (
                <Image
                  key={`info-gallery-${uri}-${index}`}
                  source={{ uri: resolveImageUri(uri) }}
                  style={styles.descriptionGalleryImage}
                />
              ))}
            </View>
          ) : null}

          {!hasDesc && !hasInfoImages && !hasSpecs ? (
            <Text style={styles.descFallback}>Chưa có thông tin</Text>
          ) : null}
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
                source={{ uri: resolveImageUri(item.image) }}
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
  headerBack: {
    margin: 10,
    borderRadius: 16,
  },
  imageBox: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    margin: 10,
  },
  slide: {
    borderRadius: 18,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 240,
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  buyNowBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d5001c",
  },
  cartBtn: {
    backgroundColor: "#d5001c",
  },
  btnDisabled: {
    backgroundColor: "#bdbdbd",
  },
  buyNowText: { color: "#d5001c", fontWeight: "bold" },
  cartBtnText: { color: "white", fontWeight: "bold" },
  chatBtn: {
    marginHorizontal: 10,
    marginTop: 10,
    backgroundColor: "#0f8b8d",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  chatBtnText: {
    color: "white",
    fontWeight: "bold",
  },
  title: { fontWeight: "bold", marginBottom: 5 },
  descriptionPanel: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  descriptionBodyPanel: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
  },
  descriptionGallery: {
    gap: 12,
    marginBottom: 10,
  },
  infoLeadImage: {
    marginBottom: 10,
  },
  infoLeadImageAfterSpecs: {
    marginTop: 12,
  },
  descriptionGalleryImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  descriptionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  descriptionLabel: {
    width: 96,
    fontWeight: "700",
    color: "#0f172a",
  },
  descriptionValue: {
    flex: 1,
    color: "#334155",
    lineHeight: 21,
  },
  descriptionBody: {
    color: "#334155",
    lineHeight: 22,
  },
  renderHeading: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 8,
  },
  renderParagraph: {
    color: "#334155",
    marginBottom: 10,
    lineHeight: 22,
  },
  renderList: {
    marginBottom: 10,
    paddingLeft: 18,
  },
  renderListItem: {
    color: "#334155",
    marginBottom: 6,
    lineHeight: 22,
  },
  renderQuote: {
    borderLeftWidth: 3,
    borderLeftColor: "#d5001c",
    paddingLeft: 12,
    color: "#475569",
    marginBottom: 10,
  },
  renderStrong: {
    color: "#0f172a",
  },
  renderCell: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
  },
  descFallback: {
    color: "#64748b",
    marginBottom: 10,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 5,
    gap: 12,
  },
  specKey: { fontWeight: "700", color: "#334155", flex: 1 },
  specValue: { flex: 1, textAlign: "right", color: "#0f172a" },
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
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#d5001c",
    opacity: 0.25,
  },
  dotActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  thumbItem: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    overflow: "hidden",
    padding: 4,
  },
  thumbActive: {
    borderColor: "#d5001c",
    borderWidth: 2,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
