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
        

        // Fetch only active categories
        const activeCategories = await categorySchema.find({ isActive: true }).select('_id');

        // Fetch only active brands
        const activeBrands = await brandSchema.find({ isActive: true }).select('_id');

        // Extract the category IDs and brand IDs
        const activeCategoryIds = activeCategories.map(category => category._id);
        const activeBrandIds = activeBrands.map(brand => brand._id);

        // Filter products: Active products with active categories and brands
        const productFilter = {
            isActive: true,
            productCategory: { $in: activeCategoryIds }, 
            productBrand: { $in: activeBrandIds },        
            productName: { $regex: search, $options: "i" },
        };

        // Fetch the filtered products with pagination
        const products = await productSchema
            .find(productFilter)
            .skip((page - 1) * limit)
            .limit(limit);

        // Count the total products matching the filter
        const count = await productSchema.countDocuments(productFilter);

        // Fetch active categories for rendering
        const categories = await categorySchema.find({ isActive: true });

        // Fetch active brands for rendering
        const brands = await brandSchema.find({ isActive: true });

        // Render the product page
        res.render('user/allproduct', {
            title: "All Products",
            user: req.session.user,
            product: products,
            category: categories,
            brand: brands,
            search,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            page,
            limit
        });
    } catch (error) {
        console.log(`Error in all products rendering: ${error}`);
        res.status(500).send('Internal Server Error');
    }
};


// ---------------- render product details ------------------

const productDetail = async (req,res)=>{
    
    try {
        
        const id = req.params.id;
        

        if(!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('error','Invalid Product Id');
            return res.redirect('/home');
        }

        const product = await productSchema.findById(id);

        //console.log(product);
        

        if(!product){
            
            req.flash('error','Product not found');
            return res.redirect('/home')
        }
        
        if(product.isActive){
            const similarProduct = await productSchema.find({
                productCategory:product.productCategory,
                isActive:true
            })
            //console.log(similarProduct);
            

            return res.render('user/productDetail',{
                        title: product.productName,
                        user:req.session.user,
                        product,
                        similarProduct
                    })
        } else {
            req.flash('error','Product is not available');
            return res.redirect('/home');
        }

        
    }
    catch(error){
        console.log(`Error in rendering product detail page ${error}`);
    }
}


module.exports={
    allProduct,
    productDetail
}
