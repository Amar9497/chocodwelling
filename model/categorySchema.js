const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,  // Ensure categoryName is required
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true }); // Corrected option name here

module.exports = mongoose.model('Category', categorySchema); // 
