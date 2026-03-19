const mongoose = require("mongoose");

const addressItemSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  address: String,
  city: String,
  isDefault: Boolean
});

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [addressItemSchema]
});

module.exports = mongoose.model("Address", addressSchema);