const Wishlist = require('../../model/wishlistSchema');
const Product = require('../../model/productSchema');

const wishlistController = {
    // Get wishlist page
    wishlistpage: async (req, res) => {
        try {
            const userId = req.session.user;
            const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
            res.render('user/wishlist', {title : 'wishlist', wishlist: wishlist || { products: [] } });
        } catch (error) {
            console.error('Error in wishlist page:', error);
            res.status(500).render('error', { message: 'Internal server error' });
        }
    },

    // Add product to wishlist
    addWishlist: async (req, res) => {
        try {
            const userId = req.session.user;
            const productId = req.params.id;

            // Check if product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found' 
                });
            }

            // Find user's wishlist
            let wishlist = await Wishlist.findOne({ user: userId });

            // If wishlist doesn't exist, create new
            if (!wishlist) {
                wishlist = new Wishlist({
                    user: userId,
                    products: [productId]
                });
                await wishlist.save();
                return res.json({ 
                    success: true, 
                    message: 'Product added to wishlist',
                    isNewWishlist: true 
                });
            }

            // Check if product already exists in wishlist
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Product already in wishlist',
                    exists: true
                });
            }

            // Add product to existing wishlist
            wishlist.products.push(productId);
            await wishlist.save();
            res.json({ 
                success: true, 
                message: 'Product added to wishlist' 
            });

        } catch (error) {
            console.error('Error adding to wishlist:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to add to wishlist' 
            });
        }
    },

    // Remove product from wishlist
    deleteWishlist: async (req, res) => {
        try {
            const userId = req.session.user;
            const productId = req.params.id;

            const wishlist = await Wishlist.findOne({ user: userId });
            if (!wishlist) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Wishlist not found' 
                });
            }

            // Check if product exists in wishlist
            if (!wishlist.products.includes(productId)) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found in wishlist' 
                });
            }

            wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
            await wishlist.save();
            res.json({ 
                success: true, 
                message: 'Product removed from wishlist' 
            });

        } catch (error) {
            console.error('Error removing from wishlist:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to remove from wishlist' 
            });
        }
    }
};

module.exports = wishlistController;
