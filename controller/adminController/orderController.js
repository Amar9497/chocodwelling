const orderSchema = require('../../model/orderSchema');

//-------------------order page rendering---------------

const orderPage = async (req,res) =>{
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        let query = {};

        if(search){
            const searchNumber = Number(search);
            if(!isNaN(searchNumber)) {
                query.order_id = searchNumber;
            }
        }

        const orders = await orderSchema.find(query)
            .sort({ createdAt: -1})
            .limit(limit)
            .skip((page - 1) * limit);

        const count = await orderSchema.countDocuments(query);

        res.render('admin/order',{
            title:"Order Details",
            orders,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search,
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

//---------------------------Single order details------------------------

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

module.exports = {
    orderPage,
    orderStatus,
    orderView
}