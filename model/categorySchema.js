const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,  
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true }); 

module.exports = mongoose.model('Category', categorySchema); // 
