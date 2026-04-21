const ChatThread = require("../models/ChatThread");
const User = require("../models/User");

const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const type = String(attachment.type || "product");

  if (type !== "product") {
    return null;
  }

  const name = String(attachment.name || "").trim();

  return {
    type: "product",
    productId: attachment.productId || null,
    name,
    price: Number(attachment.price || 0),
    image: String(attachment.image || "").trim(),
  };
};

const normalizeMessage = (message) => ({
  senderRole: message.senderRole,
  senderId: message.senderId || null,
  senderName: message.senderName,
  content: message.content || "",
  attachment: message.attachment || null,
  createdAt: message.createdAt,
});

const buildThread = async (userId) => {
  const existing = await ChatThread.findOne({ user: userId }).lean();

  if (existing) {
    return existing;
  }

  const created = await ChatThread.create({
    user: userId,
    messages: [],
    lastMessageAt: new Date(),
  });

  return created.toObject();
};

const appendMessage = async ({ userId, senderRole, senderId, senderName, content, attachment }) => {
  const normalizedContent = String(content || "").trim();
  const normalizedAttachment = normalizeAttachment(attachment);

  if (!normalizedContent && !normalizedAttachment) {
    const error = new Error("Nội dung tin nhắn không được để trống");
    error.statusCode = 400;
    throw error;
  }

  let thread = await ChatThread.findOne({ user: userId });

  if (!thread) {
    thread = new ChatThread({
      user: userId,
      messages: [],
      lastMessageAt: new Date(),
    });
  }

  thread.messages.push({
    senderRole,
    senderId,
    senderName,
    content: normalizedContent,
    attachment: normalizedAttachment,
    createdAt: new Date(),
  });

  thread.lastMessageAt = new Date();
  await thread.save();

  return thread.toObject();
};

const getUserThread = async (req, res) => {
  try {
    const thread = await buildThread(req.user.id);

    res.json({
      success: true,
      thread: {
        user: thread.user,
        messages: (thread.messages || []).map(normalizeMessage),
        lastMessageAt: thread.lastMessageAt,
      },
    });
  } catch (err) {
    console.error("Get user thread error:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải hội thoại",
    });
  }
};

const sendUserMessage = async (req, res) => {
  try {
    const thread = await appendMessage({
      userId: req.user.id,
      senderRole: "user",
      senderId: req.user.id,
      senderName: req.user.username || "user",
      content: req.body.content,
      attachment: req.body.attachment,
    });

    res.status(201).json({
      success: true,
      thread: {
        user: thread.user,
        messages: (thread.messages || []).map(normalizeMessage),
        lastMessageAt: thread.lastMessageAt,
      },
    });
  } catch (err) {
    console.error("Send user message error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Không thể gửi tin nhắn",
    });
  }
};

const listAdminThreads = async (req, res) => {
  try {
    const threads = await ChatThread.find()
      .populate("user", "username email phoneNumber")
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json({
      success: true,
      threads: threads.map((thread) => ({
        user: thread.user,
        lastMessageAt: thread.lastMessageAt,
        messageCount: thread.messages?.length || 0,
        lastMessage: thread.messages?.[thread.messages.length - 1]
          ? normalizeMessage(thread.messages[thread.messages.length - 1])
          : null,
      })),
    });
  } catch (err) {
    console.error("List admin threads error:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách hội thoại",
    });
  }
};

const getAdminThread = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const thread = await buildThread(userId);

    res.json({
      success: true,
      thread: {
        user,
        messages: (thread.messages || []).map(normalizeMessage),
        lastMessageAt: thread.lastMessageAt,
      },
    });
  } catch (err) {
    console.error("Get admin thread error:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải hội thoại",
    });
  }
};

const sendAdminMessage = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const adminName = req.adminUser?.username || "admin";

    const thread = await appendMessage({
      userId,
      senderRole: "admin",
      senderId: req.adminUser?._id || req.adminUser?.id || null,
      senderName: adminName,
      content: req.body.content,
      attachment: req.body.attachment,
    });

    res.status(201).json({
      success: true,
      thread: {
        user: thread.user,
        messages: (thread.messages || []).map(normalizeMessage),
        lastMessageAt: thread.lastMessageAt,
      },
    });
  } catch (err) {
    console.error("Send admin message error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Không thể gửi tin nhắn",
    });
  }
};

module.exports = {
  getUserThread,
  sendUserMessage,
  listAdminThreads,
  getAdminThread,
  sendAdminMessage,
};
