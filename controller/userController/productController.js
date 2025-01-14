const productSchema= require('../../model/productSchema');
const categorySchema= require('../../model/categorySchema');
const brandSchema = require('../../model/brandSchema');
const mongoose = require('mongoose');


// --------------- list all product -------------


const allProduct = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const categories = req.query.categories?.split(',') || [];
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const sort = req.query.sort || "new"; // Default sort

        const productFilter = {
            isActive: true,
            productName: { $regex: search, $options: "i" }
        };

        // Add category filter if categories are selected
        if (categories.length > 0) {
            productFilter.productCategory = { 
                $in: categories.map(id => new mongoose.Types.ObjectId(id))
            };
        }

        // Add price range filter
        if (minPrice !== null || maxPrice !== null) {
            productFilter['productVariants.price'] = {};
            if (minPrice !== null) productFilter['productVariants.price'].$gte = minPrice;
            if (maxPrice !== null) productFilter['productVariants.price'].$lte = maxPrice;
        }

        // Define sort options
        let sortOption = {};
        switch (sort) {
            case 'price-low':
                sortOption = { 'productVariants.0.price': 1 };
                break;
            case 'price-high':
                sortOption = { 'productVariants.0.price': -1 };
                break;
            case 'a-z':
                sortOption = { productName: 1 };
                break;
            case 'z-a':
                sortOption = { productName: -1 };
                break;
            default: // 'new'
                sortOption = { createdAt: -1 };
        }

        // Fetch active categories and brands
        const activeCategories = await categorySchema.find({ isActive: true });
        const activeBrands = await brandSchema.find({ isActive: true });

        // Fetch filtered and sorted products
        const products = await productSchema
            .find(productFilter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        const count = await productSchema.countDocuments(productFilter);

        res.render('user/allproduct', {
            title: "All Products",
            user: req.session.user,
            product: products,
            category: activeCategories,
            brand: activeBrands,
            search,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
            sort 
        });
    } catch (error) {
        console.error('Error in all products rendering:', error);
        res.status(500).send('Internal Server Error');
    }
};


// ---------------- render product details ------------------


const productDetail = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('error', 'Invalid Product Id');
            return res.redirect('/home');
        }

        const product = await productSchema.findById(id)
            .populate({
                path: 'reviews.user',
                select: 'name'
            });

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/home');
        }

        if (product.isActive) {
            // Calculate ratings
            const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;

            // Calculate rating distribution
            const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            product.reviews.forEach(review => {
                ratingDistribution[review.rating]++;
            });

            // Get similar products
            const similarProduct = await productSchema.find({
                productCategory: product.productCategory,
                isActive: true,
                _id: { $ne: product._id } // Exclude current product
            }).limit(4);

            // Add ratings data to product object
            const productWithRatings = {
                ...product.toObject(),
                ratings: {
                    average: averageRating,
                    total: product.reviews.length,
                    distribution: ratingDistribution
                }
            };

            return res.render('user/productDetail', {
                title: product.productName,
                user: req.session.user,
                product: productWithRatings,
                similarProduct
            });
        } else {
            req.flash('error', 'Product is not available');
            return res.redirect('/home');
        }
    } catch (error) {
        console.log(`Error in rendering product detail page ${error}`);
        req.flash('error', 'Something went wrong');
        return res.redirect('/home');
    }
};


module.exports={
    allProduct,
    productDetail
}
