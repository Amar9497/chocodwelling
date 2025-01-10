
const Product = require('../../model/productSchema');
const Order = require('../../model/orderSchema');
const fs = require('fs');
const path = require('path');


    // Add a review
    const addReview = async (req, res) => {
        try {
            // Set JSON content type
            res.setHeader('Content-Type', 'application/json');
    
            const { productId } = req.params;
            const { rating, review } = req.body;
            const userId = req.session.user;
    
            // Debug log
            console.log('Review submission:', {
                productId,
                rating,
                review,
                userId
            });
    
            // Validate inputs
            if (!rating || !review) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating and review are required'
                });
            }
    
            // Check if user has purchased the product
            const order = await Order.findOne({
                userId: userId,
                'products.productId': productId,
                orderStatus: 'Delivered'
            });
    
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'You can only review products you have purchased and received'
                });
            }
    
            // Find the product
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
    
            // Check for existing review
            const existingReview = product.reviews.find(
                r => r.user.toString() === userId.toString()
            );
    
            if (existingReview) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this product'
                });
            }
    
            // Create review object
            const newReview = {
                user: userId,
                rating: parseInt(rating),
                review: review.trim(),
                isVerifiedPurchase: true
            };
    
            // Save review
            product.reviews.push(newReview);
            await product.save();
    
            // Mark as reviewed in order
            const productIndex = order.products.findIndex(
                p => p.productId.toString() === productId
            );
    
            if (productIndex !== -1) {
                order.products[productIndex].isReviewed = true;
                await order.save();
            }
    
            return res.status(200).json({
                success: true,
                message: 'Review added successfully'
            });
    
        } catch (error) {
            console.error('Review submission error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to add review'
            });
        }
    };




const getAllReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        // Find product and populate reviews with user details
        const product = await Product.findById(productId)
            .populate({
                path: 'reviews.user',
                select: 'name profileImage'
            })
            .select('name reviews ratings');

        if (!product) {
            return res.render('user/error', {
                message: 'Product not found'
            });
        }

        // Calculate ratings distribution
        const ratingDistribution = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };

        product.reviews.forEach(review => {
            ratingDistribution[review.rating]++;
        });

        const totalReviews = product.reviews.length;
        const totalPages = Math.ceil(totalReviews / limit);

        // Get paginated reviews
        const reviews = product.reviews
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(skip, skip + limit);

        // Calculate average rating
        const averageRating = totalReviews > 0
            ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        res.render('user/all-reviews', {
            title : "all-revies",
            product: {
                ...product.toObject(),
                ratings: {
                    average: averageRating,
                    total: totalReviews,
                    distribution: ratingDistribution
                }
            },
            reviews,
            currentPage: page,
            totalPages,
            totalReviews,
            limit
        });

    } catch (error) {
        console.error('Get all reviews error:', error);
        res.render('user/error', {
            message: 'Failed to load reviews'
        });
    }
}


module.exports={
    addReview,
    getAllReviews
}
