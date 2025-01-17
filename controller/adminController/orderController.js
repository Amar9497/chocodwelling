const orderSchema = require('../../model/orderSchema');
const walletSchema = require('../../model/walletSchema');

//-------------------order page rendering---------------

const orderPage = async (req,res) =>{
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        // Sanitize search input to allow only letters and numbers
        const sanitizedSearch = search.replace(/[^a-zA-Z0-9]/g, '');

        let query = {};

        if (sanitizedSearch) {
            // Search by order ID using string match
            query = {
                $or: [
                    { _id: { $regex: sanitizedSearch, $options: 'i' } },
                    { 'orderIdString': { $regex: sanitizedSearch, $options: 'i' } }
                ]
            };
        }

        const orders = await orderSchema.aggregate([
            {
                $addFields: {
                    orderIdString: { $toString: "$_id" }
                }
            },
            {
                $match: query
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
            }
        ]);

        const count = await orderSchema.aggregate([
            {
                $addFields: {
                    orderIdString: { $toString: "$_id" }
                }
            },
            {
                $match: query
            },
            {
                $count: 'total'
            }
        ]);

        const total = count.length > 0 ? count[0].total : 0;

        res.render('admin/order', {
            title: "Order Details",
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            search: sanitizedSearch,
            limit
        });
    }
    catch(error){
        console.log(`error in rendering admin order page ${error}`);
    }
}

//---------------------changing order status--------------------

const orderStatus = async (req,res) =>{
    try {
        const {orderId} = req.params;
        const {status} = req.body;

        const validStatuses = ['Pending', 'Shipped', 'Confirmed', 'Delivered', 'Cancelled', 'Returned'];
        const currentOrder = await orderSchema.findOne({_id:orderId});

        if(!currentOrder){
            return res.status(404).send('Order not found');
        }

        if(validStatuses.indexOf(status) <= validStatuses.indexOf(currentOrder.status)){
            return req.flash('error','Invalid status change');
        }
        
        // Update order status and timestamp
        currentOrder.orderStatus = status;
        currentOrder.statusUpdatedAt = new Date();

        // If order is delivered, update payment status to completed
        if (status === 'Delivered') {
            currentOrder.paymentStatus = 'Completed';
            currentOrder.deliveredAt = new Date();
        }

        await currentOrder.save();
        res.status(200).send('Order status updated');
        
    }
    catch(error){
        console.log(`error in changing order status from admin side ${error}`);
    }
}

//--------------------------- order details------------------------

const orderView = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Find order and populate product details
        const orderDetails = await orderSchema.findById(orderId)
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
            return res.redirect('/admin/orders');
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
            finalAmount: orderDetails.finalAmount,
            couponCode: orderDetails.couponCode,
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

        // Render admin order view template
        res.render('admin/order-view', {
            title: "Order Details",
            orderDetails: formattedOrder
        });

    } catch (error) {
        console.error('Error in rendering order view page:', error);
        req.flash('error', 'Error loading order details');
        res.redirect('/admin/orders');
    }
};


// ------------------- return details --------------------------


const getReturnDetails = async (req, res) => {
    try {
        const order = await orderSchema.findById(req.params.orderId);
        if (!order || !order.returnReason) {
            return res.status(404).json({ success: false, message: 'Return request not found' });
        }
        
        res.json({
            success: true,
            reason: order.returnReason.reason,
            description: order.returnReason.description,
            requestedAt: order.returnReason.requestedAt
        });
    } catch (error) {
        console.error('Error fetching return details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


// -------------------------- update return status --------------------------------


const updateReturnStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update return request status
        order.returnReason.status = status;

        // If approved, update order status to Returned and process refund
        if (status === 'Approved') {
            order.orderStatus = 'Returned';
            
            // Process refund if payment was made through Razorpay or Wallet or COD
            if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet' || order.paymentMethod === 'COD') {
                // Find or create wallet for the order's user
                let wallet = await walletSchema.findOne({ userID: order.userId });
                
                if (!wallet) {
                    wallet = new walletSchema({
                        userID: order.userId,
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
        }

        await order.save();

        res.json({
            success: true,
            message: `Return request ${status.toLowerCase()} successfully`
        });

    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update return status'
        });
    }
};

module.exports = {
    orderPage,
    orderStatus,
    orderView,
    getReturnDetails,
    updateReturnStatus
}