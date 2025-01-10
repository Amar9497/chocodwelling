const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
  rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
  },
  review: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500
  },
  isVerifiedPurchase: {
      type: Boolean,
      default: false
  },
  createdAt: {
      type: Date,
      default: Date.now
  }
});

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
    },
    productDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 98
  },
  ratings: {
        average: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        },
        distribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        }
    },
    reviews: [reviewSchema],
},{timestamps:true});


// Calculate ratings before saving
productSchema.pre('save', function(next) {
  if (this.reviews.length > 0) {
      // Calculate total reviews
      this.ratings.total = this.reviews.length;
      
      // Calculate average rating
      const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
      this.ratings.average = totalRating / this.reviews.length;
      
      // Calculate rating distribution
      this.ratings.distribution = {
          1: this.reviews.filter(review => review.rating === 1).length,
          2: this.reviews.filter(review => review.rating === 2).length,
          3: this.reviews.filter(review => review.rating === 3).length,
          4: this.reviews.filter(review => review.rating === 4).length,
          5: this.reviews.filter(review => review.rating === 5).length
      };
  } else {
      // Reset ratings if no reviews
      this.ratings = {
          average: 0,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
  }
  next();
});

module.exports = mongoose.model('Product',productSchema);
