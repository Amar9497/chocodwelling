const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName:{
        type:String,
        required:true
    },
    productBrand:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required:true,
    },
    productCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required:true,
    },    
    productDescription:{
        type:String,
        required:true
    },
    
    productImage:{
        type:[String],
        required:true
    },
    productVariants: [
        {
          weight: {
            type: Number,
            required: true,
            min: 0,
          },
          price: {
            type: Number,
            required: true,
            min: 0,
          },
          stock: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      isActive:{
        type:Boolean,
        default:true
    }
},{timestamps:true})

module.exports = mongoose.model('Product',productSchema);
