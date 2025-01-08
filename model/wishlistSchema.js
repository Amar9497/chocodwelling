const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    products: [{
        productID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product', 
            required: true
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);