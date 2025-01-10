const brandSchema = require('../../model/brandSchema');
const productSchema = require('../../model/productSchema');

const getBrandProducts = async (req, res) => {
    try {
        const brandId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || "";
        const sort = req.query.sort || "new";

        const brand = await brandSchema.findById(brandId);
        if (!brand) {
            return res.status(404).redirect('/category');
        }

        // Build filter object
        let filter = {
            productBrand: brandId,
            isActive: true
        };

        if (search) {
            filter.productName = { $regex: search, $options: "i" };
        }

        // Build sort object
        let sortOption = {};
        switch (sort) {
            case "price-low":
                sortOption = { "productVariants.price": 1 };
                break;
            case "price-high":
                sortOption = { "productVariants.price": -1 };
                break;
            case "a-z":
                sortOption = { productName: 1 };
                break;
            case "z-a":
                sortOption = { productName: -1 };
                break;
            default:
                sortOption = { createdAt: -1 }; // newest first
        }

        // Get total count for pagination
        const totalProducts = await productSchema.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Get products
        const products = await productSchema
            .find(filter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('user/brandProducts', {
            title: brand.brandName,
            brand,
            products,
            currentPage: page,
            totalPages,
            limit,
            search,
            sort,
            user: req.session.user
        });

    } catch (error) {
        console.log(`Error in getting brand products: ${error}`);
        res.redirect('/category');
    }
};

module.exports = {
    getBrandProducts
};