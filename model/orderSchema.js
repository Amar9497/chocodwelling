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
        name: String,  
        quantity: {    
            type: Number,
            required: true
        },
        price: {       
            type: Number,
            required: true
        },
        image: String, 
        // status: {
        //     type: String,
        //     enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
        //     default: 'Pending'
        // },
        isReviewed: {
            type: Boolean,
            default: false
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    finalAmount: {
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
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    paymentFailureReason: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
        default: 'Pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    paymentDetails: {
        orderId: String,
        paymentId: String,
        signature: String,
        amount: Number,
        currency: String
    },
    couponCode: {
        type: String
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    returnReason: {
        reason: String,
        description: String,
        status: {
            type: String,
            enum: ['Pending','Request', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        requestedAt: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
