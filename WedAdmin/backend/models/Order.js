const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
    city: String
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    items: [orderItemSchema],

    totalPrice: {
      type: Number,
      required: true
    },

    shippingAddress: shippingAddressSchema,

    paymentMethod: {
      type: String,
      enum: ['COD', 'BANKING', 'MOMO'],
      default: 'COD'
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },

    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipping', 'completed', 'cancelled'],
      default: 'pending'
    },

    trackingNumber: String
  },
  { timestamps: true }
);

// ✅ tạo orderNumber an toàn hơn
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber =
      'ORD' +
      Date.now() +
      Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);