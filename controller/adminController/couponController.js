const Coupon = require('../../model/couponSchema');



// --------------------- coupon page -------------------


const getCoupons = async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    try {
        if (req.params.id) {
            const coupon = await Coupon.findById(req.params.id);
            if (!coupon) {
                req.flash('error', 'Coupon not found');
                return res.redirect('/admin/coupons'); 
            }
            req.flash('success', 'Coupon fetched successfully');
            return res.json(coupon);
        }

        const coupons = await Coupon.find({ code: { $regex: search, $options: 'i' } })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const count = await Coupon.countDocuments({ code: { $regex: search, $options: 'i' } });

        res.render('admin/coupons', { 
            coupons, 
            title: 'Coupons',
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search,
            limit,
            page,
            messages: req.flash(),
        });
    } catch (error) {
        console.log(`Error while rendering coupon page: ${error}`);
        req.flash('error', 'Error fetching coupon data');
        res.redirect('/admin/coupons'); 
    }
};


// -------------------------- add coupon ---------------------------------


const addCoupon = async (req, res) => {
    const { code, discountType, discountValue, startDate, endDate, minimumOrderAmount } = req.body;

    // Basic field validation
    if (!code || !discountType || !discountValue || !startDate || !endDate || !minimumOrderAmount) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        

        // Validate minimum order amount
        const minAmountNum = Number(minimumOrderAmount);
        if (isNaN(minAmountNum) || minAmountNum < 500) {
            return res.status(400).json({ 
                message: 'Minimum order amount must be at least ₹500' 
            });
        }

        // Validate dates
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);
        
        if (startDateTime >= endDateTime) {
            return res.status(400).json({ 
                message: 'End date must be after start date' 
            });
        }

        // Check for existing coupon
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            code,
            discountType,
            discountValue,
            startDate,
            endDate,
            minimumOrderAmount
        });

        await newCoupon.save();
        res.json({ message: 'Coupon added successfully' }); 
    } catch (error) {
        console.error('Error adding coupon:', error);
        req.flash('error', 'Error adding coupon');
        res.redirect('/admin/add-coupon'); 
    }
};


// -------------------------- edit coupon --------------------------


const editCoupon = async (req, res) => {
    const { id, code, discountType, discountValue, startDate, endDate, minimumOrderAmount } = req.body;
    
    // Basic field validation
    if (!id || !code || !discountType || !discountValue || !startDate || !endDate || minimumOrderAmount === undefined) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        

        // Validate minimum order amount
        const minAmountNum = Number(minimumOrderAmount);
        if (isNaN(minAmountNum) || minAmountNum < 500) {
            return res.status(400).json({ 
                message: 'Minimum order amount must be at least ₹500' 
            });
        }

        // Validate dates
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);
        
        if (startDateTime >= endDateTime) {
            return res.status(400).json({ 
                message: 'End date must be after start date' 
            });
        }

        // Check for existing coupon code (excluding current coupon)
        const existingCoupon = await Coupon.findOne({ 
            code: code, 
            _id: { $ne: id } 
        });
        
        if (existingCoupon) {
            return res.status(400).json({ 
                message: 'Coupon code already exists' 
            });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id, 
            { code, discountType, discountValue, startDate, endDate, minimumOrderAmount }, 
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({ message: 'Coupon updated successfully' });
    } catch (error) {
        console.error('Error edit coupon:', error);
        req.flash('error', 'Error edit coupon');
        res.redirect('/admin/add-coupon');
    }
};


// ------------------------------ coupon status -------------------------------


const toggleCouponStatus = async (req, res) => {
    const couponId = req.query.id;
    const status = req.query.status === 'true';
    try {
        await Coupon.findByIdAndUpdate(couponId, { isActive: !status });
        req.flash('success','Coupon status updated successfully')
        res.redirect('/admin/coupons')
    } catch (error) {
        console.log(`Error while changing status: ${error}`);
        res.flash('error' ,'Error updating coupon status' );
        res.redirect('/admin/add-coupon');
    }
};



module.exports = {
    getCoupons,
    addCoupon,
    editCoupon,
    toggleCouponStatus
}

