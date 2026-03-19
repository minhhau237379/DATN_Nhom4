const mongoose = require("mongoose");

const favoriteItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { _id: false },
);

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    items: [favoriteItemSchema],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Favorite", favoriteSchema);
