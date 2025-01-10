const wishlistSchema = require('../../model/wishlistSchema');
const productSchema = require('../../model/productSchema');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// ----------------- wishlist page render ---------------------

const wishlistpage = async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error', "User is Not Found, Please Login Again");
            return res.redirect('/login');
        }

        const wishlist = await wishlistSchema.findOne({ userID: req.session.user })
            .populate({
                path: 'products.productID',
                model: 'Product'  
            });

        if (wishlist) {
            res.render('user/wishlist', {
                title: "Wishlist",
                products: wishlist.products,
                user: req.session.user
            });
        } else {
            res.render('user/wishlist', {
                title: "Wishlist",
                products: [],
                user: req.session.user
            });
        }
    } catch (error) {
        console.error('Error while rendering wishlist page:', error);
        req.flash('error', 'Failed to load wishlist');
        res.redirect('/home');
    }
};


// -------------------------- add to wishlist------------------------------

const addWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: "Please login to add items to wishlist" });
        }

        const productID = req.params.id;
        const userID = req.session.user;

        const product = await productSchema.findById(productID);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        let wishlist = await wishlistSchema.findOne({ userID });
        
        if (wishlist) {
            const productExists = wishlist.products.some(item => 
                item.productID.toString() === productID
            );

            if (productExists) {
                return res.status(400).json({ error: "Product already in wishlist" });
            }

            wishlist.products.push({ productID });
        } else {
            wishlist = new wishlistSchema({
                userID,
                products: [{ productID }]
            });
        }

        await wishlist.save();
        return res.status(200).json({ success: "Product added to wishlist" });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ error: "Failed to add product to wishlist" });
    }
};

//----------------------------------Delete Wishlist-----------------------------

const deleteWishlist = async (req, res) => {
    const userId = req.session.user;
    const itemId = req.params.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'User not found. Please login again.' });
    }
    if (!itemId || !ObjectId.isValid(itemId)) {
        return res.status(400).json({ success: false, message: 'Invalid item.' });
    }
    try {
        const wish = await wishlistSchema.findOne({ userID: userId });
        if (wish) {
            wish.products.pull({ productID: new ObjectId(itemId) });
            await wish.save();
            return res.json({ success: true, message: 'Item removed from wishlist.' });
        } else {
            return res.status(404).json({ success: false, message: 'Wishlist not found.' });
        }
    } catch (err) {
        console.error(`Error in removing the item from wishlist: ${err}`);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
};

module.exports = {
    wishlistpage,
    addWishlist,
    deleteWishlist
};