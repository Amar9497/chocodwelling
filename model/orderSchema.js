const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','Returned'],
            default: 'Pending'
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        building: String,
        street: String,
        city: String,
        state: String,
        country: String,
        pincode: String,
        phoneNumber: String
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Wallet', 'Razorpay'],
        required: true
    },
    paymentId: {
        type: String,
        required: false
    },
    paymentStatus: {
        type: String,
        required: false
        // enum: ['Pending', 'Completed', 'Failed'],
        // default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled','Returned'],
        default: 'Pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);