import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppToast from "../../components/AppToast";
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

export default function ChatScreen() {
  const params = useLocalSearchParams<ProductChatParams>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
  }, [messages]);

  const handleSend = async () => {
    const content = draft.trim();

    if (!content && !productAttachment) {
      showNotice("Thông báo", "Nhập nội dung trước khi gửi");
      return;
    }

    setSending(true);
    try {
      const thread = await sendChatMessage({
        content: content || (productAttachment ? `Mình muốn hỏi về ${productAttachment.name}` : ""),
        attachment: productAttachment,
      });

      setMessages(thread.messages || []);
      setDraft("");
      showNotice("Thành công", "Đã gửi tin nhắn cho admin");
    } catch (err) {
      console.error("Send chat message error:", err);
      showNotice("Lỗi", "Không thể gửi tin nhắn");
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat với admin</Text>
        <Text style={styles.subtitle}>Trao đổi trực tiếp như trên sàn thương mại điện tử</Text>
      </View>

      {productAttachment ? (
        <View style={styles.quickSend}>
          <View style={styles.quickSendInfo}>
            <Text style={styles.quickSendLabel}>Sản phẩm đang mở</Text>
            <Text numberOfLines={2} style={styles.quickSendName}>
              {productAttachment.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.quickSendBtn} onPress={handleSend} disabled={sending}>
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
            inverted
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
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <AppToast
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        onHide={closeNotice}
      />
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
    color: "#fff",
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
    backgroundColor: "#d5001c",
  },
  adminBubble: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sender: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
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
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
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
    backgroundColor: "#d5001c",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
});
