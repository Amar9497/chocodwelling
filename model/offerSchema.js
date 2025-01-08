const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerType:{
        type:String,
        enum:['Product','Category'],
        required:true,
    },
    referenceId:{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'offerType',
        required: true,
    },
    discountPercent:{
        type: Number,
        required: true,
    },
    isActive:{
        type: Boolean,
        default: true,
    }
},{timestamps: true})

module.exports = mongoose.model('offer',offerSchema);
