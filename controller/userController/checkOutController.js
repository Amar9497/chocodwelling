const productSchema = require('../../model/productSchema');
const cartSchema = require('../../model/cartSchema');
const userSchema = require('../../model/userSchema');
const addressSchema = require('../../model/addressSchema');
const orderSchema = require('../../model/orderSchema')

const {objectId} = require('mongoose');

// ---------------------- checkout page rendering --------------------

const checkout = async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error', 'User not found, Please login again');
            return res.redirect('/login');
        }

        const userId = req.session.user;
        const user = await userSchema.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Get cart items with populated product details
        const cartItems = await cartSchema.find({ userId })
            .populate('productId')  // Changed from items.productId to productId
            .exec();

        if (!cartItems || cartItems.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Check product availability
        for (const item of cartItems) {
            if (!item.productId.isActive) {
                req.flash('error', 'Some products in your cart are not available');
                return res.redirect('/cart');
            }
        }

        // Calculate cart totals
        const cartDetails = cartItems.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            subtotal: item.productId.productVariants[0].price * item.quantity
        }));

        const total = cartDetails.reduce((sum, item) => sum + item.subtotal, 0);
        //console.log(cartDetails)

        res.render('user/checkout', {
            title: 'Checkout',
            user,
            cartItems: cartDetails,
            total,
            userDetails: user
        });

    } catch (error) {
        console.log(`error in rendering checkout page from cart ${error}`);
        res.status(500).send('An error occurred while processing your request');
    }
};

// ------------------------- add address -----------------------------

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userAddress = {
            building:req.body.building,
            street:req.body.street,
            city:req.body.city,
            phonenumber:req.body.phonenumber,
            pincode:req.body.pincode,
            landmark:req.body.landmark,
            state:req.body.state,
            country:req.body.country
        }
        const user = await userSchema.findById(userId)
        if (user.address.length > 3) {
            req.flash("error", "Maximum Address limit Reached")
            return res.redirect('/profile')
        }
        user.address.push(userAddress);
        await user.save();

        req.flash('success', 'New address added')
        res.redirect('/checkout')
    } catch (err) {
        console.log(`Error on adding new address from checkout ${err}`);
    }
}

//------------------------place order---------------------

const placeOrder = async (req, res) => {
    //console.log(req.body)
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod } = req.body;

        // Get cart items
        const cartItems = await cartSchema.find({ userId }).populate('productId');
        
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Get user and address details
        const user = await userSchema.findById(userId);
        // Find the selected address using array index
        const selectedAddress = user.address[parseInt(addressId)];
        
        if (!selectedAddress) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected'
            });
        }

        // Calculate total and prepare order products
        const orderProducts = [];
        let totalAmount = 0;

        for (const item of cartItems) {
            // Check stock availability
            const product = await productSchema.findById(item.productId._id);
            if (!product || product.productVariants[0].stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName}`
                });
            }

            // Reduce stock
            product.productVariants[0].stock -= item.quantity;
            await product.save();

            // Add to order products
            orderProducts.push({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.productVariants[0].price,
                status: 'Pending'
            });

            totalAmount += item.productId.productVariants[0].price * item.quantity;
        }

        // Create new order
        const newOrder = new orderSchema({
            userId,
            products: orderProducts,
            totalAmount,
            shippingAddress: selectedAddress,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Completed' : 'Completed',
            orderStatus: 'Confirmed'
        });

        await newOrder.save();

        // Clear cart
        await cartSchema.deleteMany({ userId });

        return res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: newOrder._id
        });

    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to place order'
        });
    }
};


module.exports = {
    checkout,
    addAddress,
    placeOrder
}


