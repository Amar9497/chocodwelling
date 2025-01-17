const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountType: {
        type: String,
        enum: ['Percentage', 'Fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                if (this.discountType === 'Percentage') {
                    return value > 0 && value <= 90;
                } else { // Fixed amount
                    return value > 0 && value <= 1000;
                }
            },
            message: props => {
                if (props.value <= 0) {
                    return 'Discount value must be greater than 0';
                }
                return props.value.discountType === 'Percentage' 
                    ? 'Percentage discount must be between 1 and 90%'
                    : 'Fixed discount must be between 1 and ₹1000';
            }
        }
    },
    minimumOrderAmount: {
        type: Number,
        required: true,
        min: [500, 'Minimum order amount must be at least ₹500']
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);

