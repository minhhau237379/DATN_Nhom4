const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: Number,
        default: 1,
        enum: [0, 1]
    }
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
