const orderSchema = require("../../model/orderSchema");
const productSchema = require('../../model/productSchema');
const walletSchema = require('../../model/walletSchema');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
                product_id : product.productId,
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
        const { reason, description } = req.body;
        const userId = req.session.user;

        const order = await orderSchema.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is eligible for return (within 7 days)
        const deliveryDate = new Date(order.deliveredAt);
        const currentDate = new Date();
        const daysDifference = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysDifference > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return period expired (7 days)'
            });
        }

        // Update order with return request
        order.returnReason = {
            reason,
            description,
            status: 'Request',
            requestedAt: new Date()
        };

        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Return request submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting return request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit return request'
        });
    }
};



// ------------------------order Details-----------------------


const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;

        
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

// ------------------------- invoice download -------------------------

const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await orderSchema.findById(orderId)
            .populate('products.productId')
            .populate('userId', 'name email phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Add company details
        doc.fontSize(20).text('CHOCO DWELLING', 50, 50);
        doc.fontSize(10).text('Dotspace Business Park', 50, 80);
        doc.text('Thiruvananthapuram, Kerala, 695582', 50, 95);
        doc.text('Phone: (123) 456-7890', 50, 110);
        doc.text('Email: info@chocodwelling.com', 50, 125);

        // Add line
        doc.moveTo(50, 140).lineTo(550, 140).stroke();

        // Add invoice details
        doc.fontSize(16).text('INVOICE', 50, 160);
        doc.fontSize(10)
            .text(`Invoice Number: ${order._id.toString().slice(-6).toUpperCase()}`, 50, 185)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 200)
            .text(`Payment Method: ${order.paymentMethod}`, 50, 215);

        // Add customer details
        doc.fontSize(12).text('Bill To:', 50, 245);
        doc.fontSize(10)
            .text(order.userId.name, 50, 260)
            .text(order.userId.email, 50, 275)
            .text(order.userId.phone, 50, 290);

        // Add shipping address
        doc.fontSize(12).text('Ship To:', 300, 245);
        doc.fontSize(10)
            .text(order.shippingAddress.building, 300, 260)
            .text(order.shippingAddress.street, 300, 275)
            .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 300, 290)
            .text(`${order.shippingAddress.pincode}`, 300, 305);

        // Add table headers
        let y = 350;
        doc.fontSize(10)
            .text('Item', 50, y)
            .text('Quantity', 250, y)
            .text('Price', 350, y)
            .text('Total', 450, y);

        // Add line
        y += 20;
        doc.moveTo(50, y).lineTo(550, y).stroke();

        // Add items
        y += 20;
        order.products.forEach(item => {
            doc.text(item.productId.productName, 50, y)
                .text(item.quantity.toString(), 250, y)
                .text(`${item.price.toFixed(2)}`, 350, y)
                .text(`${(item.quantity * item.price).toFixed(2)}`, 450, y);
            y += 20;
        });

        // Add line
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 20;

        // Add totals
        doc.text('Subtotal:', 350, y).text(`${order.totalAmount.toFixed(2)}`, 450, y);
        y += 20;
        doc.text('Total:', 350, y).text(`${order.finalAmount.toFixed(2)}`, 450, y);

        // Add footer
        doc.fontSize(10)
            .text('Thank you for your business!', 50, 700, { align: 'center' })
            .text('For any queries, please contact support@chocodwelling.com', 50, 715, { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Error generating invoice' });
    }
};


// ===--------------------- retrypayment -------------------------------------

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.session.user;
        
        // Find the order
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify order belongs to user
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.finalAmount * 100), // Convert to paise
            currency: 'INR',
            receipt: orderId.toString(),
            notes: {
                orderId: orderId,
                userId: userId
            }
        });

        console.log('Razorpay order created:', razorpayOrder); // Debug log

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            orderId: razorpayOrder.id,
            order_id: orderId,
            currency: 'INR',
            notes: {
                orderId: orderId,
                userId: userId
            }
        });

    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initialize payment'
        });
    }
};


// --------------- verify retrypayment -----------------------


const verifyRetryPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Update order status
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.paymentStatus = 'Completed';
        order.paymentMethod = "Razorpay";
        order.paymentDetails = {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            amount: order.finalAmount,
            currency: 'INR'
        };
        await order.save();

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: order._id
        });

    } catch (error) {
        console.error('Verify retry payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment'
        });
    }
};

// Add this new function to update payment status
const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, status, reason } = req.body;
        
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.paymentStatus = status;
        if (reason) {
            order.paymentFailureReason = reason;
        }
        await order.save();

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });

    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
};



module.exports = {
    orderPage,
    cancelOrder,
    orderDetails,
    returnOrder,
    generateInvoice,
    retryPayment,
    verifyRetryPayment,
    updatePaymentStatus
}
