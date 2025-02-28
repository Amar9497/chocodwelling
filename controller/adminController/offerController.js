const offerSchema = require('../../model/offerSchema');
const productSchema = require('../../model/productSchema');
const categorySchema = require('../../model/categorySchema');
const mongoose = require('mongoose');
const {objectId} = mongoose.Types

const getOffer = async (req,res)=>{
    try {
        // Sanitize search input to allow only letters
        const searchInput = req.query.search || '';
        const search = searchInput.replace(/[^A-Za-z\s]/g, '');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        // Update query to be case-insensitive and match offer type
        const query = search ? {
            offerType: { 
                $regex: new RegExp(`^${search}`, 'i') // Start with the search term
            }
        } : {};

        const offers = await offerSchema.find(query)
            .populate('referenceId')
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ updatedAt: -1 });

        // Update count query to match the search
        const count = await offerSchema.countDocuments(query);
        const products = await productSchema.find({ isActive: true }).sort({ createdAt: -1 });
        const categories = await categorySchema.find({ isActive: true }).sort({ createdAt: -1 });

        res.render('admin/offer', {
            title: "Offers",
            offers,
            products,
            categories,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search, // Pass sanitized search term back to view
            limit,
            page
        });
    } catch (error) {
        console.log(`Error while rendering Offer Page: ${error}`);
        req.flash('error', 'An error occurred while fetching offers. Please try again.');
        res.redirect('/admin/offer');
    }
}


// ------------------------------ add offer -------------------------


const addOffer = async (req, res) => {
    try {
        const { offerType, referenceId, discountPercent } = req.body;
        console.log('Received offer data:', req.body); // Debug log

        // Validate inputs
        if (!offerType || !referenceId || !discountPercent) {
            req.flash('error', 'All fields are required');
            return res.redirect('/admin/offer');
        }

        // Validate discount percentage
        const discount = parseFloat(discountPercent);
        if (isNaN(discount) || discount < 0 || discount > 98) {
            req.flash('error', 'Invalid discount percentage');
            return res.redirect('/admin/offer');
        }

        let reference;
        if (offerType.toLowerCase() === 'category') {
            // Find category by name or ID
            reference = await categorySchema.findOne({
                $or: [
                    { _id: referenceId },
                    { categoryName: referenceId }
                ]
            });

            if (!reference) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/offer');
            }

            // Check if offer already exists for this category
            const existingOffer = await offerSchema.findOne({
                offerType: 'Category',
                referenceId: reference._id
            });

            if (existingOffer) {
                req.flash('error', 'Offer already exists for this category');
                return res.redirect('/admin/offer');
            }

            // Create new offer
            const newOffer = new offerSchema({
                offerType: 'Category',
                referenceId: reference._id,
                discountPercent: discount
            });
            await newOffer.save();

            // Update all products in this category
            const productsToUpdate = await productSchema.find({ 
                productCategory: reference._id,
                isActive: true 
            });

            await Promise.all(productsToUpdate.map(async (product) => {
                await productSchema.findByIdAndUpdate(
                    product._id,
                    { productDiscount: discount }
                );
            }));

        } else if (offerType.toLowerCase() === 'product') {
            // Find product by name or ID
            reference = await productSchema.findOne({
                $or: [
                    { _id: referenceId },
                    { productName: referenceId }
                ]
            });

            if (!reference) {
                req.flash('error', 'Product not found');
                return res.redirect('/admin/offer');
            }

            // Check if offer already exists for this product
            const existingOffer = await offerSchema.findOne({
                offerType: 'Product',
                referenceId: reference._id
            });

            if (existingOffer) {
                req.flash('error', 'Offer already exists for this product');
                return res.redirect('/admin/offer');
            }

            // Create new offer
            const newOffer = new offerSchema({
                offerType: 'Product',
                referenceId: reference._id,
                discountPercent: discount
            });
            await newOffer.save();

            // Update product discount
            await productSchema.findByIdAndUpdate(
                reference._id,
                { productDiscount: discount }
            );
        } else {
            req.flash('error', 'Invalid offer type');
            return res.redirect('/admin/offer');
        }

        req.flash('success', 'Offer added successfully');
        return res.redirect('/admin/offer');

    } catch (error) {
        console.error('Error from addOffer:', error);
        req.flash('error', 'Failed to add offer');
        return res.redirect('/admin/offer');
    }
};



// ----------------------------- edit offer ------------------------------------



const editOffer = async (req, res) => {
    try {
        const { offerId, offerType, referenceId, discountPercent } = req.body;

        // Validate inputs
        if (!offerId || !referenceId || !discountPercent) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate discount percentage
        if (discountPercent > 98 || discountPercent < 0) {
            return res.status(400).json({
                success: false,
                message: 'Discount amount must be between 0 and 98%'
            });
        }

        // Find existing offer
        const existingOffer = await offerSchema.findById(offerId);
        if (!existingOffer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        // Update based on offer type
        if (offerType === 'Category') {
            let category = null;
            if (mongoose.Types.ObjectId.isValid(referenceId)) {
                category = await categorySchema.findById(referenceId);
            }
            if (!category) {
                category = await categorySchema.findOne({ categoryName: referenceId });
            }

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            await offerSchema.findByIdAndUpdate(offerId, {
                discountPercent,
                referenceId: category._id
            });

            const productsToUpdate = await productSchema.find({ 
                productCategory: category._id 
            });

            await Promise.all(productsToUpdate.map(async (product) => {
                await productSchema.findByIdAndUpdate(
                    product._id,
                    { productDiscount: discountPercent }
                );
            }));

            return res.status(200).json({
                success: true,
                message: `Offer updated for category ${category.categoryName}`
            });

        } else if (offerType === 'Product') {
            let product = null;
            if (mongoose.Types.ObjectId.isValid(referenceId)) {
                product = await productSchema.findById(referenceId);
            }
            if (!product) {
                product = await productSchema.findOne({ productName: referenceId });
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            await offerSchema.findByIdAndUpdate(offerId, {
                discountPercent,
                referenceId: product._id
            });

            await productSchema.findByIdAndUpdate(
                product._id,
                { productDiscount: discountPercent }
            );

            return res.status(200).json({
                success: true,
                message: `Offer updated for product ${product.productName}`
            });
        }
    } catch (error) {
        console.log(`Error from editOffer: ${error}`);
        req.flash('error', 'An error occurred while editing the offer');
        res.redirect('/admin/offer');
    }
};



//-------------------------- offer status ----------------------------


const offerStatus = async (req, res) => {
    try {
        const offerId = req.query.id;
        const status = !(req.query.status === 'true');

        // Find the offer first to get its details
        const offer = await offerSchema.findById(offerId);
        
        if (!offer) {
            req.flash('error', 'Offer not found');
            return res.redirect('/admin/offer');
        }

        // Update offer status
        await offerSchema.findByIdAndUpdate(offerId, { isActive: status });

        // Handle product discounts based on offer type and status
        if (offer.offerType === 'Product') {
            // Update single product
            await productSchema.findByIdAndUpdate(
                offer.referenceId,
                { 
                    productDiscount: status ? offer.discountPercent : 0 
                }
            );
        } else if (offer.offerType === 'Category') {
            // Update all products in the category
            const productsToUpdate = await productSchema.find({ 
                productCategory: offer.referenceId,
                isActive: true 
            });

            await Promise.all(productsToUpdate.map(async (product) => {
                await productSchema.findByIdAndUpdate(
                    product._id,
                    { 
                        productDiscount: status ? offer.discountPercent : 0 
                    }
                );
            }));
        }

        // Flash success message
        req.flash('success', `Offer ${status ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/admin/offer');
        
    } catch (error) {
        console.error(`Error from offerStatus: ${error}`);
        req.flash('error', 'An error occurred while updating the offer status');
        res.redirect('/admin/offer');
    }
};




module.exports={
    getOffer,
    addOffer,
    editOffer,
    offerStatus
}
