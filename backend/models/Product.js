const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: Number,
    default: 1,
    enum: [0, 1],
  },
  id_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }
}, { timestamps: true });


module.exports = mongoose.model('Product', productSchema);
