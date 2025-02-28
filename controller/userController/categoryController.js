const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const brandSchema = require('../../model/brandSchema');



// ----------------- get category and brand page render -----------------------

const categoryget = async(req,res)=>{
    try {
        const category = await categorySchema.find({isActive: true});
        const brand = await brandSchema.find({isActive: true});
        
        res.render('user/category',{
            title:'Category',
            user:req.session.user,
            category,
            brand
        });
    }
    catch(error){
        console.log(`error in rendering category page ${error}`);
    }
}


// ---------------------- all product category page ----------------------

const getCategoryProducts = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || "";
        const sort = req.query.sort || "new";

        // Get category details
        const category = await categorySchema.findById(categoryId);
        if (!category) {
            return res.status(404).redirect('/category');
        }

        // Build filter object
        let filter = {
            productCategory: categoryId,
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

        res.render('user/categoryProducts', {
            title: category.categoryName,
            category,
            products,
            currentPage: page,
            totalPages,
            limit,
            search,
            sort,
            user: req.session.user
        });

    } catch (error) {
        console.log(`Error in getting category products: ${error}`);
        res.flash('error','Error in getting category products');
        res.redirect('/category');
    }
}




module.exports={
    categoryget,
    getCategoryProducts
}