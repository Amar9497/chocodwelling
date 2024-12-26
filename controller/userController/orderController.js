const orderSchema = require("../../model/orderSchema");
const productSchema = require('../../model/productSchema');


// ----------------------- user order page -------------------

const orderPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            req.flash('error', 'User not found, Please login again');
            return res.redirect('/login');
        }

        // Find orders with correct field name(userId instead of customer_id)
        const orderDetails = await orderSchema.find({ userId })
            .populate({
                path: 'products.productId',
                model: 'Product',
                select: 'productName productImage productVariants'
            })
            .sort({ createdAt: -1 });

        // Transform the data for the view
        const formattedOrders = orderDetails.map(order => ({
            _id: order._id,
            order_id: order._id.toString().slice(-6).toUpperCase(), // Create short order ID
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            totalPrice: order.totalAmount,
            createdAt: order.createdAt,
            products: order.products.map(product => ({
                product_name: product.productId.productName,
                product_image: product.productId.productImage[0],
                product_quantity: product.quantity,
                product_price: product.price
            }))
        }));

        res.render('user/orders', {
            title: "Orders",
            user: userId,
            orderDetails: formattedOrders
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



//------------------------order Details-----------------------

const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;

        if (!userId) {
            req.flash('error', 'Please login to view order details');
            return res.redirect('/login');
        }

        // Find order and populate product details
        const orderDetails = await orderSchema.findOne({ _id: orderId })
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

        // Check if order belongs to logged-in user
        if (orderDetails.userId._id.toString() !== userId.toString()) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/orders');
        }

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
            orderDetails: formattedOrder
        });

    } catch (error) {
        console.error('Error in rendering order details:', error);
        req.flash('error', 'Error loading order details');
        res.redirect('/orders');
    }
};

module.exports = {
    orderPage,
    cancelOrder,
    orderDetails
}
