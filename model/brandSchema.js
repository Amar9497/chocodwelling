const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brandName:{
        type:String,
        required:true,
        trim:true
    },
    brandImage:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    }
},{ timestamps: true });

module.exports=mongoose.model('Brand',brandSchema);

