const orderSchema = require("../../model/orderSchema");
const productSchema = require('../../model/productSchema');
const walletSchema = require('../../model/walletSchema');
const mongoose = require('mongoose');


// ----------------------- user order page -------------------


const orderPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            req.flash('error', 'User not found, Please login again');
            return res.redirect('/login');
        }

        const page = parseInt(req.query.page) || 1; 
        const limit = 3; 
        const skip = (page - 1) * limit; 

        // Find total orders 
        const totalOrders = await orderSchema.countDocuments({ userId });

        // 
        const orderDetails = await orderSchema.find({ userId })
            .populate({
                path: 'products.productId',
                model: 'Product',
                select: 'productName productImage productVariants'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Transform the data for the view
        const formattedOrders = orderDetails.map(order => ({
            _id: order._id,
            order_id: order._id.toString().slice(-6).toUpperCase(),
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            totalPrice: order.totalAmount,
            finalAmount: order.finalAmount, 
            createdAt: order.createdAt,
            products: order.products.map(product => ({
                product_name: product.productId.productName,
                product_image: product.productId.productImage[0],
                product_quantity: product.quantity,
                product_price: product.price
            }))
        }));

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('user/orders', {
            title: "Orders",
            user: userId,
            orderDetails: formattedOrders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error('Error in rendering users order page:', error);
        req.flash('error', 'Error in rendering order page, Please try again later');
        res.redirect('/home');
    }
};



// --------------------------- Cancel Order --------------------------------

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;
        
        // Find the order
        const order = await orderSchema.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This order cannot be cancelled'
            });
        }

        // Update product quantities
        for (const item of order.products) {
            const product = await productSchema.findById(item.productId);
            if (product) {
                // Add the quantity back to stock
                product.productVariants[0].stock += item.quantity;
                await product.save();
            }
        }

        // Update order status
        order.orderStatus = 'Cancelled';
        await order.save();

        // Credit wallet if payment was made through Razorpay or Wallet
        if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') {
            // Find or create wallet
            let wallet = await walletSchema.findOne({ userID: userId });
            
            if (!wallet) {
                wallet = new walletSchema({
                    userID: userId,
                    balance: 0,
                    transaction: []
                });
            }

            // Add refund transaction
            wallet.transaction.push({
                wallet_amount: order.finalAmount,
                order_id: orderId,
                transactionType: 'Credited',
                transaction_date: new Date()
            });

            // Update wallet balance
            wallet.balance += order.finalAmount;
            
            await wallet.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};

// ---------------------- return order -----------------------

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;

        // Find the order
        const order = await orderSchema.findById(orderId)
            .populate('products.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is eligible for return (e.g., within 7 days and delivered)
        const deliveryDate = new Date(order.deliveredAt);
        const currentDate = new Date();
        const daysDifference = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysDifference > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return period expired (7 days)'
            });
        }

        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Order must be delivered before returning'
            });
        }

        // Update order status
        order.orderStatus = 'Returned';
        await order.save();

        // Update product stock
        for (const item of order.products) {
            const product = await productSchema.findById(item.productId);
            if (product) {
                product.productVariants[0].stock += item.quantity;
                await product.save();
            }
        }

        // Credit wallet if payment was made through Razorpay or Wallet
        if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') {
            // Find or create wallet
            let wallet = await walletSchema.findOne({ userID: userId });
            
            if (!wallet) {
                wallet = new walletSchema({
                    userID: userId,
                    balance: 0,
                    transaction: []
                });
            }

            // Add refund transaction
            wallet.transaction.push({
                wallet_amount: order.finalAmount,
                order_id: orderId,
                transactionType: 'Credited',
                transaction_date: new Date()
            });

            // Update wallet balance
            wallet.balance += order.finalAmount;
            
            await wallet.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Order returned successfully'
        });

    } catch (error) {
        console.error('Error returning order:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process return'
        });
    }
};



// ------------------------order Details-----------------------


const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;

        // Add validation for orderId
        
        if (!orderId) {
            req.flash('error', 'Invalid order ID');
            return res.redirect('/orders');
        }
        
        // Validate if orderId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            req.flash('error', 'Invalid order ID format');
            return res.redirect('/orders');
        }

        // Find order and populate product details
        const orderDetails = await orderSchema.findOne({ 
            _id: orderId,
            userId: userId  
        })
        .populate({
            path: 'products.productId',
            model: 'Product',
            select: 'productName productImage productVariants'
        })
        .populate({
            path: 'userId',
            model: 'User',
            select: 'name email phone'
        });

        if (!orderDetails) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        

        const orderData = orderDetails;
        
        // Format the order data
        const formattedOrder = {
            _id: orderDetails._id,
            orderId: orderDetails._id.toString().slice(-6).toUpperCase(),
            orderDate: orderDetails.createdAt,
            orderStatus: orderDetails.orderStatus,
            paymentMethod: orderDetails.paymentMethod,
            paymentStatus: orderDetails.paymentStatus,
            totalAmount: orderDetails.totalAmount,
            shippingAddress: orderDetails.shippingAddress,
            products: orderDetails.products.map(item => ({
                name: item.productId.productName,
                image: item.productId.productImage[0],
                price: item.price,
                quantity: item.quantity,
                status: item.status,
                subtotal: item.price * item.quantity
            })),
            customer: {
                name: orderDetails.userId.name,
                email: orderDetails.userId.email,
                phone: orderDetails.userId.phone
            }
        };

        res.render('user/orderDetail', {
            title: "Order Details",
            user: userId,
            orderDetails: formattedOrder,
            orderData
        });

    } catch (error) {
        console.error('Error in rendering order details:', error);
        req.flash('error', 'Error loading order details');
        return res.redirect('/orders');
    }
};

module.exports = {
    orderPage,
    cancelOrder,
    orderDetails,
    returnOrder
}
