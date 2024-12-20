const productSchema= require('../../model/productSchema');
const categorySchema= require('../../model/categorySchema');
const mongoose = require('mongoose');

// --------------- list all product -------------
const allProduct = async(req,res)=>{
    try{
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const category = await categorySchema.find({isActive:true});
        const product = await productSchema.find({isActive:true});

    
        
        // const product = await productSchema.find(productFilter)
        //     .skip((page-1) *limit)
        //     .limit(limit);
        
        const count = await productSchema.countDocuments({product})
        
        res.render('user/allproduct',{
            title:"All products",
            user:req.session.user,
            product,
            category,
            search,
            totalPages: Math.ceil(count / limit),
            currentPage:page,
            page,
            limit
        })
    }
    catch(error){
        console.log(`error in all products rendering ${error}`);
    }
}

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
