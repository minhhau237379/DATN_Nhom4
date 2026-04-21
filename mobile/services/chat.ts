import api from "./api";

export type ChatAttachment = {
  type: "product";
  productId?: string;
  name: string;
  price: number;
  image?: string;
};

export type ChatMessage = {
  senderRole: "user" | "admin";
  senderId?: string | null;
  senderName: string;
  content: string;
  attachment?: ChatAttachment | null;
  createdAt: string;
};

export type ChatThread = {
  user: string;
  messages: ChatMessage[];
  lastMessageAt?: string;
};

export const createProductAttachment = ({
  productId,
  name,
  price,
  image,
}: {
  productId: string;
  name: string;
  price: number;
  image?: string;
}): ChatAttachment => ({
  type: "product",
  productId,
  name,
  price,
  image,
});

export const getChatThread = async () => {
  const res = await api.get("/chat/thread");
  return res.data.thread as ChatThread;
};

export const sendChatMessage = async (payload: {
  content?: string;
  attachment?: ChatAttachment | null;
}) => {
  const res = await api.post("/chat/messages", payload);
  return res.data.thread as ChatThread;
};
