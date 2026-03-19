import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import { isLoggedIn } from "../../utils/auth";

type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
};

export default function Favorite() {
  const [items, setItems] = useState<Product[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get("/favorite");
      setItems(res.data.products || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const guardAndLoad = async () => {
        if (!(await isLoggedIn())) {
          router.replace({
            pathname: "/need-login",
            params: { feature: "favorite" },
          });
          return;
        }

        loadFavorites();
      };

      guardAndLoad();
    }, [loadFavorites]),
  );

  const toggleFav = async (id: string) => {
    try {
      const res = await api.post(`/favorite/toggle/${id}`);

      if (res.data.success) {
        setItems((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
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
      <TouchableOpacity
        style={styles.heart}
        onPress={(e) => {
          e.stopPropagation();
          toggleFav(item._id);
        }}
      >
        <Text style={styles.heartIcon}>♥</Text>
      </TouchableOpacity>

      <Image
        source={{ uri: `http://localhost:3003${item.image}` }}
        style={styles.image}
      />

      <Text numberOfLines={2} style={styles.name}>
        {item.name}
      </Text>

      <Text style={styles.price}>
        {item.price.toLocaleString("vi-VN")} VND
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Sản phẩm yêu thích</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyText}>Chưa có sản phẩm yêu thích</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  listContent: {
    padding: 12,
    paddingBottom: 92,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    minHeight: 220,
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
    marginTop: 14,
  },
  name: {
    marginTop: 8,
    textAlign: "center",
    color: "#111",
    fontSize: 15,
    minHeight: 44,
  },
  price: {
    color: "#d5001c",
    fontWeight: "700",
    marginTop: 6,
    fontSize: 18,
  },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  heartIcon: {
    color: "#e30019",
    fontSize: 26,
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 38,
    color: "#d5001c",
    marginBottom: 8,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
});
