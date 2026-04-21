const mongoose = require("mongoose");

const chatAttachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["product"],
      default: "product",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    name: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    senderRole: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    attachment: {
      type: chatAttachmentSchema,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const chatThreadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const ChatThread = mongoose.model("ChatThread", chatThreadSchema);

module.exports = ChatThread;
