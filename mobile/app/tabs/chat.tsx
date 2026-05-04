import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppToast from "../../components/AppToast";
import api from "../../services/api";
import BackHeader from "../../components/BackHeader";
import { isLoggedIn } from "../../utils/auth";
import { resolveImageUri } from "../../utils/productImage";
import {
  createProductAttachment,
  getChatThread,
  sendChatMessage,
  type ChatMessage,
} from "../../services/chat";

type ProductChatParams = {
  productId?: string;
  productName?: string;
  productPrice?: string;
  productImage?: string;
};

type ProductPickerItem = {
  _id: string;
  name: string;
  price: number;
  image: string | string[];
  stock?: number;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<ProductChatParams>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerProducts, setPickerProducts] = useState<ProductPickerItem[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<ReturnType<
    typeof createProductAttachment
  > | null>(null);
  const [notice, setNotice] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const productAttachment = useMemo(() => {
    if (!params.productId || !params.productName) {
      return null;
    }

    return createProductAttachment({
      productId: params.productId,
      name: params.productName,
      price: Number(params.productPrice || 0),
      image: params.productImage || "",
    });
  }, [params.productId, params.productName, params.productPrice, params.productImage]);

  useEffect(() => {
    setPendingAttachment(productAttachment);
  }, [productAttachment]);

  const showNotice = (title: string, message: string) => {
    setNotice({ visible: true, title, message });
  };

  const closeNotice = () => {
    setNotice({ visible: false, title: "", message: "" });
  };

  const loadThread = useCallback(async () => {
    try {
      const thread = await getChatThread();
      setMessages(thread.messages || []);
    } catch (err) {
      console.error("Load chat thread error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (keyword?: string) => {
    setPickerLoading(true);

    try {
      const res = await api.get("/shop", {
        params: {
          search: keyword?.trim() || "",
        },
      });

      setPickerProducts(res.data.products || []);
    } catch (err) {
      console.error("Load chat products error:", err);
      showNotice("Thông báo", "Không thể tải danh sách sản phẩm");
    } finally {
      setPickerLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const guardAndLoad = async () => {
        if (!(await isLoggedIn())) {
          router.replace({
            pathname: "/need-login",
            params: { feature: "chat" },
          });
          return;
        }

        setLoading(true);
        await loadThread();
      };

      const interval = setInterval(() => {
        loadThread();
      }, 8000);

      guardAndLoad();

      return () => clearInterval(interval);
    }, [loadThread]),
  );

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!pickerVisible) {
      return;
    }

    const timer = setTimeout(() => {
      loadProducts(pickerSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [pickerVisible, pickerSearch, loadProducts]);

  const handleSend = async () => {
    const content = draft.trim();

    if (!content && !pendingAttachment) {
      showNotice("Thông báo", "Nhập nội dung trước khi gửi");
      return;
    }

    setSending(true);
    try {
      const thread = await sendChatMessage({
        content: content || (productAttachment ? `Mình muốn hỏi về ${productAttachment.name}` : ""),
        attachment: pendingAttachment,
      });

      setMessages(thread.messages || []);
      setDraft("");
      setPendingAttachment(null);
      // showNotice("Thành công", "Đã gửi tin nhắn cho admin");
    } catch (err) {
      console.error("Send chat message error:", err);
      showNotice("Thông báo", "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleComposerSend = async () => {
    const content = draft.trim();
    const fallbackContent = pendingAttachment
      ? `Mình muốn hỏi về ${pendingAttachment.name}`
      : "";

    if (!content && !pendingAttachment) {
      showNotice("Thông báo", "Nhập nội dung trước khi gửi");
      return;
    }

    setSending(true);
    try {
      const thread = await sendChatMessage({
        content: content || fallbackContent,
        attachment: pendingAttachment,
      });

      setMessages(thread.messages || []);
      setDraft("");
      setPendingAttachment(null);
    } catch (err) {
      console.error("Send chat message error:", err);
      showNotice("Thông báo", "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const openProductPicker = async () => {
    setPickerVisible(true);
    setPickerSearch("");
    await loadProducts("");
  };

  const handleSendProduct = async (product: ProductPickerItem) => {
    const attachment = createProductAttachment({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: Array.isArray(product.image) ? product.image[0] || "" : product.image || "",
    });

    setSending(true);
    try {
      const thread = await sendChatMessage({
        content: `Mình muốn hỏi về sản phẩm: ${product.name}`,
        attachment,
      });

      setMessages(thread.messages || []);
      setPendingAttachment(null);
      setPickerVisible(false);
      setPickerSearch("");
    } catch (err) {
      console.error("Send chat product error:", err);
      showNotice("Thông báo", "Không thể gửi sản phẩm vào chat");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.senderRole === "user";

    return (
      
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAdmin]}>
        
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.adminBubble]}>
          <Text style={styles.sender}>{isUser ? "Bạn" : item.senderName || "Admin"}</Text>
          {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}

          {item.attachment?.type === "product" ? (
            <View style={styles.attachmentCard}>
              <Image
                source={{ uri: resolveImageUri(item.attachment.image || "") }}
                style={styles.attachmentImage}
              />
              <View style={styles.attachmentBody}>
                <Text numberOfLines={2} style={styles.attachmentTitle}>
                  {item.attachment.name}
                </Text>
                <Text style={styles.attachmentPrice}>
                  {Number(item.attachment.price || 0).toLocaleString("vi-VN")} VND
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 20}
    >
      <View style={styles.header}>
        
        <Text style={styles.title}></Text>
        <Text style={styles.subtitle}>Trao đổi trực tiếp với admin</Text>
      </View>

      {pendingAttachment ? (
        <View style={styles.quickSend}>
          <View style={styles.quickSendInfo}>
            <Text style={styles.quickSendLabel}>Sản phẩm đang mở</Text>
            <Text numberOfLines={2} style={styles.quickSendName}>
              {pendingAttachment.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickSendBtn}
            onPress={handleComposerSend}
            disabled={sending}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.quickSendBtnText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.listWrap}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#e30019" />
            <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, index) => `${item.createdAt}-${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={42} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
                <Text style={styles.emptyText}>
                  Gửi tin nhắn đầu tiên để bắt đầu trao đổi với admin.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.composer}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={openProductPicker}
          disabled={sending}
        >
          <Ionicons name="bag-handle-outline" size={22} color="#475569" />
        </TouchableOpacity>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <AppToast
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        onHide={closeNotice}
      />

      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn sản phẩm</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Tìm sản phẩm"
              placeholderTextColor="#94a3b8"
              style={styles.modalSearch}
            />

            {pickerLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#d5001c" />
              </View>
            ) : (
              <FlatList
                data={pickerProducts}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => (
                  <View style={styles.productRow}>
                    <Image
                      source={{ uri: resolveImageUri(item.image) }}
                      style={styles.productRowImage}
                    />
                    <View style={styles.productRowBody}>
                      <Text numberOfLines={2} style={styles.productRowName}>
                        {item.name}
                      </Text>
                      <Text style={styles.productRowPrice}>
                        {item.price.toLocaleString("vi-VN")} VND
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.productRowBtn}
                      onPress={() => handleSendProduct(item)}
                      disabled={sending}
                    >
                      <Text style={styles.productRowBtnText}>Gửi</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>Không có sản phẩm phù hợp</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748b",
  },
  quickSend: {
    margin: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#fff8f8",
    borderWidth: 1,
    borderColor: "#f3c7cc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quickSendInfo: {
    flex: 1,
    gap: 4,
  },
  quickSendActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickSendLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#d5001c",
    textTransform: "uppercase",
  },
  quickSendName: {
    color: "#0f172a",
    fontWeight: "600",
  },
  quickSendGhostBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f1b8bf",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickSendBtn: {
    backgroundColor: "#d5001c",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickSendBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#475569",
  },
  listContent: {
    paddingVertical: 12,
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAdmin: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  userBubble: {
    backgroundColor: "#158e03",
  },
  adminBubble: {
    backgroundColor: "#158e03",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sender: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  messageText: {
    color: "#0f172a",
    lineHeight: 21,
  },
  attachmentCard: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  attachmentImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  attachmentBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  attachmentTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  attachmentPrice: {
    color: "#d5001c",
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    lineHeight: 21,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  toolBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "82%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalClose: {
    color: "#d5001c",
    fontWeight: "700",
  },
  modalSearch: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    color: "#0f172a",
  },
  modalLoading: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalListContent: {
    paddingVertical: 14,
    gap: 12,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  productRowImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
  },
  productRowBody: {
    flex: 1,
    gap: 6,
  },
  productRowName: {
    color: "#0f172a",
    fontWeight: "700",
  },
  productRowPrice: {
    color: "#d5001c",
    fontWeight: "700",
  },
  productRowBtn: {
    minWidth: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f04f67",
    alignItems: "center",
  },
  productRowBtnText: {
    color: "#d5001c",
    fontWeight: "700",
  },
  modalEmpty: {
    paddingVertical: 28,
    alignItems: "center",
  },
  modalEmptyText: {
    color: "#64748b",
  },
});
