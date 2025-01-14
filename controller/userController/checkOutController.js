const mongoose = require('mongoose');
const productSchema = require('../../model/productSchema');
const cartSchema = require('../../model/cartSchema');
const userSchema = require('../../model/userSchema');
const addressSchema = require('../../model/addressSchema');
const orderSchema = require('../../model/orderSchema');
const offerSchema = require('../../model/offerSchema');
const couponSchema = require('../../model/couponSchema');
const walletSchema = require('../../model/walletSchema');
const {objectId} = require('mongoose');

require('dotenv').config();

const Razorpay = require('razorpay');
const crypto = require('crypto');
const { log } = require('console');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



// ---------------------- checkout page rendering --------------------


const checkout = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await userSchema.findById(userId);
        
        if (!userId || !user) {
            req.flash('error', 'Please login to continue');
            return res.redirect('/login');
        }

        // Get cart items with populated product details
        const cartItems = await cartSchema.find({ userId })
            .populate('productId')
            .exec();

        if (!cartItems || cartItems.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Filter out invalid cart items and check availability
        const unavailableProducts = [];
        const outOfStockProducts = [];
        const validCartItems = [];

        for (const item of cartItems) {
            // Check if product exists and is valid
            if (!item.productId || typeof item.productId !== 'object') {
                // Remove invalid cart item
                await cartSchema.findByIdAndDelete(item._id);
                continue;
            }

            // Check if product is active
            if (!item.productId.isActive) {
                unavailableProducts.push(item.productId.productName || 'Unknown Product');
                continue;
            }

            // Check if product has variants and stock
            if (!item.productId.productVariants || !item.productId.productVariants[0]) {
                unavailableProducts.push(item.productId.productName || 'Unknown Product');
                continue;
            }

            // Check stock availability
            const variant = item.productId.productVariants[0];
            if (variant.stock <= 0) {
                outOfStockProducts.push(item.productId.productName);
            } else if (variant.stock < item.quantity) {
                outOfStockProducts.push(
                    `${item.productId.productName} (Only ${variant.stock} available)`
                );
            } else {
                validCartItems.push(item);
            }
        }

        // If there are any unavailable or out of stock products
        if (unavailableProducts.length > 0 || outOfStockProducts.length > 0) {
            let errorMessage = '';
            
            if (unavailableProducts.length > 0) {
                errorMessage += `The following products are no longer available: ${unavailableProducts.join(', ')}. `;
            }
            
            if (outOfStockProducts.length > 0) {
                errorMessage += `The following products are out of stock: ${outOfStockProducts.join(', ')}. `;
            }

            errorMessage += 'Please update your cart.';
            req.flash('error', errorMessage);
            return res.redirect('/cart');
        }

        // Calculate cart totals with discounts and offers
        const cartDetails = await Promise.all(validCartItems.map(async item => {
            try {
                const basePrice = item.productId.productVariants[0].price;
                
                // Check for product-specific offer
                const productOffer = await offerSchema.findOne({
                    offerType: 'Product',
                    referenceId: item.productId._id,
                    isActive: true
                });

                // Check for category offer
                const categoryOffer = await offerSchema.findOne({
                    offerType: 'Category',
                    referenceId: item.productId.category,
                    isActive: true
                });

                // Calculate discounts
                const productDiscount = item.productId.productDiscount || 0;
                const offerDiscount = Math.max(
                    productOffer ? productOffer.discountPercent : 0,
                    categoryOffer ? categoryOffer.discountPercent : 0
                );
                
                const finalDiscount = Math.max(productDiscount, offerDiscount);
                const discountedPrice = basePrice - (basePrice * finalDiscount / 100);
                
                return {
                    product: item.productId,
                    quantity: item.quantity,
                    basePrice: basePrice,
                    discount: finalDiscount,
                    discountedPrice: discountedPrice,
                    subtotal: discountedPrice * item.quantity,
                    originalPrice: basePrice * item.quantity 
                };
            } catch (error) {
                console.error('Error processing cart item:', error);
                return null;
            }
        }));

        // Filter out any null items from processing errors
        const validCartDetails = cartDetails.filter(Boolean);

        if (validCartDetails.length === 0) {
            req.flash('error', 'No valid items in cart');
            return res.redirect('/cart');
        }

        const total = validCartDetails.reduce((sum, item) => sum + item.subtotal, 0);
        const originalTotal = validCartDetails.reduce((sum, item) => sum + item.originalPrice, 0);
        const totalSavings = originalTotal - total;

        res.render('user/checkout', {
            title: 'Checkout',
            user,
            cartItems: validCartDetails,
            total,
            originalTotal,
            totalSavings,
            userDetails: user
        });

    } catch (error) {
        console.error('Error in checkout:', error);
        req.flash('error', 'An error occurred while processing your checkout');
        res.redirect('/cart');
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
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod, couponCode } = req.body;
        let totalAmount = parseFloat(req.body.totalPrice);
        let finalAmount = parseFloat(req.body.finalAmount);

        if (isNaN(totalAmount) || isNaN(finalAmount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount values'
            });
        }

        const cartItems = await cartSchema.find({ userId })
            .populate('productId')
            .exec();

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const user = await userSchema.findById(userId);
        const selectedAddress = user.address[parseInt(addressId)];

        if (!selectedAddress) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected'
            });
        }

        const orderProducts = await Promise.all(cartItems.map(async (item) => {
            const product = item.productId;
            const basePrice = product.productVariants[0].price;

            const [productOffer, categoryOffer] = await Promise.all([
                offerSchema.findOne({
                    offerType: 'Product',
                    referenceId: product._id,
                    isActive: true
                }),
                offerSchema.findOne({
                    offerType: 'Category',
                    referenceId: product.category,
                    isActive: true
                })
            ]);

            const productDiscount = product.productDiscount || 0;
            const offerDiscount = Math.max(
                productOffer ? productOffer.discountPercent : 0,
                categoryOffer ? categoryOffer.discountPercent : 0
            );
            const finalDiscount = Math.max(productDiscount, offerDiscount);
            const finalPrice = basePrice - (basePrice * finalDiscount / 100);

            return {
                productId: product._id,
                quantity: item.quantity,
                price: finalPrice
                
            };
        }));

        
        const newOrder = new orderSchema({
            userId,
            products: orderProducts,
            totalAmount,
            finalAmount,
            shippingAddress: {
                building: selectedAddress.building,
                street: selectedAddress.street,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phoneNumber: selectedAddress.phoneNumber
            },
            paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Confirmed',
            couponCode: couponCode || undefined
        });
        

        if (paymentMethod === 'COD' && finalAmount > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Orders above ₹1000 are not allowed for Cash on Delivery'
            });
        }
         

        switch (paymentMethod) {
            case 'COD':
                newOrder.paymentStatus = 'Pending';
                await newOrder.save();
                await updateStockAndClearCart(cartItems, userId);
                
                return res.status(200).json({
                    success: true,
                    message: 'Order placed successfully',
                    orderId: newOrder._id
                });

            case 'Wallet':
                // Check wallet balance
                const wallet = await walletSchema.findOne({ userID: userId });
                
                if (!wallet || wallet.balance < finalAmount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient wallet balance'
                    });
                }

                try {
                    // Update wallet balance
                    await walletSchema.updateOne(
                        { userID: userId },
                        {
                            $inc: { balance: -finalAmount },
                            $push: {
                                transaction: {
                                    wallet_amount: finalAmount,
                                    order_id: newOrder._id.toString(),
                                    transactionType: 'Debited',
                                    transaction_date: new Date()
                                }
                            }
                        }
                    );

                    // Save order
                    newOrder.paymentStatus = 'Completed';
                    await newOrder.save();

                    // Update stock and clear cart
                    await updateStockAndClearCart(cartItems, userId);

                    return res.status(200).json({
                        success: true,
                        message: 'Order placed successfully using wallet',
                        orderId: newOrder._id
                    });
                } catch (error) {
                    await orderSchema.findByIdAndDelete(newOrder._id);
                    throw error;
                }

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment method'
                });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to place order',
            error: error.message
        });
    }
};






// update stock and clear cart
async function updateStockAndClearCart(cartItems, userId) {
    try {
        // Update product stock
        for (const item of cartItems) {
            await productSchema.updateOne(
                { _id: item.productId._id },
                { $inc: { 'productVariants.0.stock': -item.quantity } }
            );
        }

        // Clear cart
        await cartSchema.deleteMany({ userId });
    } catch (error) {
        throw new Error('Failed to update stock and clear cart: ' + error.message);
    }
}



// ------------------------- validate coupon ---------------------


const validateCoupon = async (req, res) => {
    try {
        const { couponCode, total } = req.body;
        const userId = req.session.user;

        // Find the coupon
        const coupon = await couponSchema.findOne({ 
            code: couponCode,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }

        // Check minimum order amount
        if (total < coupon.minimumOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount of Rs. ${coupon.minimumOrderAmount} required`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'Percentage') {
            discountAmount = (total * coupon.discountValue) / 100;
        } else {
            discountAmount = coupon.discountValue;
        }

        return res.json({
            success: true,
            discount: discountAmount,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Error applying coupon'
        });
    }
};


// ------------------------- creat Razorpay order --------------------------


const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, addressId } = req.body;
    const userId = req.session.user;


    if (!amount || !addressId) {
      throw new Error('Amount and address are required');
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);

    // Store order details in session
    req.session.razorpayOrder = {
      orderId: order.id,
      amount: amount,
      addressId: addressId
    };

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID 
    });

  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
};





// ---------------------- vefiy payment ----------------------


const verifyPayment = async (req, res) => {
    console.log(`varify ${req.body}`);
    
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            orderId,
            addressId,
            couponCode 
        } = req.body;

        // Verify payment signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed - Invalid signature"
            });
        }

        const userId = req.session.user;

        // Get cart with populated product
        const cartItems = await cartSchema.find({ userId })
            .populate('productId')
            .exec();
        
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const user = await userSchema.findById(userId);
        const selectedAddress = user.address[parseInt(addressId)];
        
        if (!selectedAddress) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected'
            });
        }

        let totalAmount = 0;
        let finalAmount = 0;
        const orderProducts = [];

        // Calculate product totals with discounts
        for (const item of cartItems) {
            const product = await productSchema.findById(item.productId._id);
            const basePrice = product.productVariants[0].price;

            // Get applicable offers
            const [productOffer, categoryOffer] = await Promise.all([
                offerSchema.findOne({
                    offerType: 'Product',
                    referenceId: product._id,
                    isActive: true
                }),
                offerSchema.findOne({
                    offerType: 'Category',
                    referenceId: product.category,
                    isActive: true
                })
            ]);

            // Calculate final price with discounts
            const productDiscount = product.productDiscount || 0;
            const offerDiscount = Math.max(
                productOffer ? productOffer.discountPercent : 0,
                categoryOffer ? categoryOffer.discountPercent : 0
            );
            const finalDiscount = Math.max(productDiscount, offerDiscount);
            const finalPrice = basePrice - (basePrice * finalDiscount / 100);

            
            orderProducts.push({
                productId: product._id,
                quantity: item.quantity,
                price: finalPrice
            });

            totalAmount += finalPrice * item.quantity;
            finalAmount += finalPrice * item.quantity;
        }

        //Add delivery charge if applicable
        if (finalAmount < 500) {
            finalAmount += 100;
        }


        // Apply coupon if present
        if (couponCode) {
            const coupon = await couponSchema.findOne({
                code: couponCode,
                isActive: true
            });
            if (coupon) {
                const couponDiscount = coupon.discountType === 'Percentage' 
                    ? (finalAmount * coupon.discountValue / 100)
                    : coupon.discountValue;
                finalAmount -= couponDiscount;
            }
        }

        

        // Create new order
        const newOrder = new orderSchema({
            userId,
            products: orderProducts,
            totalAmount, 
            finalAmount, 
            couponCode,
            shippingAddress: selectedAddress,
            paymentMethod: 'Razorpay',
            paymentStatus: 'Completed',
            orderStatus: 'Confirmed',
            paymentDetails: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature
            }
        });

        await newOrder.save();

        // Update product stock and clear cart
        for (const item of cartItems) {
            const product = await productSchema.findById(item.productId._id);
            product.productVariants[0].stock -= item.quantity;
            await product.save();
        }

        await cartSchema.deleteMany({ userId });

        return res.status(200).json({
            success: true,
            message: 'Payment verified and order placed successfully',
            orderId: newOrder._id
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};





// Add this new controller function
const cancelRazorpayOrder = async (req, res) => {
    console.log('Cancel order request body:', req.body);
    try {
        const { 
            razorpay_order_id,
            addressId,
            paymentMethod,
            couponCode,
            totalPrice,
            finalAmount
        } = req.body;

        if (isNaN(totalPrice) || isNaN(finalAmount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount values'
            });
        }

        const userId = req.session.user;

        const cartItems = await cartSchema.find({ userId })
            .populate('productId')
            .exec();

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const user = await userSchema.findById(userId);
        const selectedAddress = user.address[parseInt(addressId)];

        if (!selectedAddress) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected'
            });
        }

        const orderProducts = await Promise.all(cartItems.map(async (item) => {
            const product = item.productId;
            const basePrice = product.productVariants[0].price;

            const [productOffer, categoryOffer] = await Promise.all([
                offerSchema.findOne({
                    offerType: 'Product',
                    referenceId: product._id,
                    isActive: true
                }),
                offerSchema.findOne({
                    offerType: 'Category',
                    referenceId: product.category,
                    isActive: true
                })
            ]);

            const productDiscount = product.productDiscount || 0;
            const offerDiscount = Math.max(
                productOffer ? productOffer.discountPercent : 0,
                categoryOffer ? categoryOffer.discountPercent : 0
            );
            const finalDiscount = Math.max(productDiscount, offerDiscount);
            const finalPrice = basePrice - (basePrice * finalDiscount / 100);

            return {
                productId: product._id,
                quantity: item.quantity,
                price: finalPrice
                
            };
        }));

        
        const newOrder = new orderSchema({
            userId,
            products: orderProducts,
            totalAmount : totalPrice,
            finalAmount,
            shippingAddress: {
                building: selectedAddress.building,
                street: selectedAddress.street,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phoneNumber: selectedAddress.phoneNumber
            },
            paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Confirmed',
            couponCode: couponCode || undefined
        });

        if(paymentMethod === 'Razorpay'){
            newOrder.paymentStatus = 'Pending';
                await newOrder.save();
                await updateStockAndClearCart(cartItems, userId);
                
                return res.status(200).json({
                    success: true,
                    message: 'Order cancelled',
                    orderId: newOrder._id
                });
        }

    } catch (error) {
        console.error('Error cancelling Razorpay order:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to cancel order'
        });
    }
};



module.exports = {
    checkout,
    addAddress,
    placeOrder,
    createRazorpayOrder,
    verifyPayment,
    validateCoupon,
    cancelRazorpayOrder
}


