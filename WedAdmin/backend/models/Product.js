const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  description: String,
  stock: Number,
  id_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }
}, { timestamps: true });


module.exports = mongoose.model('Product', productSchema);
