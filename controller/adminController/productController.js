const productSchema = require('../../model/productSchema');
const categorySchema = require('../../model/categorySchema');
const brandSchema = require('../../model/brandSchema');
const { render } = require('ejs');
const cloudinary = require('cloudinary').v2;

// ------------ product page rendering -------------

const loadProduct = async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1); // Ensure page is at least 1
    const itemsPerPage = 10;

    try {
        const totalProduct = await productSchema.countDocuments();
        const totalPages = Math.max(Math.ceil(totalProduct / itemsPerPage), 1);
        const currentPage = Math.min(page, totalPages); // Prevent exceeding totalPages

        // Adjust skip calculation
        const skip = Math.max((currentPage - 1) * itemsPerPage, 0);

        const products = await productSchema.find()
            .skip(skip) // Skip cannot be negative
            .limit(itemsPerPage);

        res.render('admin/products', {
            title: 'Products',
            products,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to load products.');
        res.status(500).render('admin/products', {
            title: 'Products',
            products: [],
            currentPage: 1,
            totalPages: 1,
            messages: req.flash(),
        });
    }
};



// ------------ add product page rendering ------------

const loadAddProduct=async(req,res)=>{
    try {
        const category = await categorySchema.find()
        const brand = await brandSchema.find()
        res.render('admin/addproduct',{
            title:'Products',
            category,
            brand
        })
    } catch (error) {
        console.log(error)
    }
}

const uploadBase64ImageToCloudinary = async (base64Data)=>{
    return new Promise((resolve,reject)=>{
        cloudinary.uploader.upload(
            base64Data,
            {folder:"upload"},
            (error,result) =>{
                if(error) return reject(error);
                return resolve(result.secure_url);
            }
        )
    })
}


// --------------------- add products -------------
const addProductPost = async (req, res) => {
    try {
        const isArray = [];

        // Loop through all files uploaded
        for (const img of req.files) {
            try {
                const imageUrl = await uploadBase64ImageToCloudinary(img.path);
                isArray.push(imageUrl);
            } catch (uploadError) {
                console.error(`Image upload failed: ${uploadError}`);
            }
        }

        const product = {
            productName: req.body.name,
            productBrand: req.body.brand,
            productCategory: req.body.category,
            productDescription: req.body.description,
            productVariants: [
                {
                    weight: req.body.weight,
                    price: req.body.price,
                    stock: req.body.stock
                }
            ],
            productImage: isArray
        };

        console.log(product);

        // Check if product already exists
        const check = await productSchema.findOne({
            productName: product.productName,
            productCategory: product.productCategory
        });

        if (!check) {
            // Product doesn't exist, add to database
            await productSchema.insertMany(product);
            
            req.flash('success', 'Product successfully added!');
        } else {
            
            req.flash('error', 'Product already exists!');
        }

        res.redirect('/admin/products');
        
    } catch (error) {
        console.log(`Error in add product post: ${error}`);
        
        req.flash('error', 'Failed to add product. Please try again.');
        
        res.redirect('/admin/addproduct');
    }
};


// -------------------- edit product page redering----------------
const loadEditProduct = async(req,res)=>{
    //console.log(req.params.id)
    try {
        const id = req.params.id;
        //console.log(id);
        
        const products = await productSchema.findById(id)
        //console.log(products);
        const category = await categorySchema.find()
        const brand = await brandSchema.find()
        
        
        if(products) {
            res.render('admin/editproduct',{
                title:'Edit Product',
                products,
                category,
                brand
            })
        } else {
            req.flash('error','Unable to edit product')
            res.redirect('/admin/products')
        }
    } catch (error) {
        console.log(`error in rendering edit product page ${error}`);
    }

}

// ---------------------- edit product --------------------

const editProductPost = async (req, res) => {
    try {
        const id = req.params.id;
        const imageToDelete = JSON.parse(req.body.deletedImages || '[]');
        const croppedImages = JSON.parse(req.body.croppedImages || '[]');
        const variants = [{
            weight: req.body.weight,
            price: req.body.price,
            stock: req.body.stock
        }];

        // Delete the images from Cloudinary
        for (const img of imageToDelete) {
            try {
                await cloudinary.uploader.destroy(img);
                console.log(`Image deleted successfully from Cloudinary`);
            } catch (err) {
                console.log(`Error in deleting image from Cloudinary: ${err}`);
            }
        }

        // If images are deleted, remove them from the database
        if (imageToDelete.length > 0) {
            await productSchema.findByIdAndUpdate(id, {
                $pull: { productImage: { $in: imageToDelete } }
            });
        }

        // Upload the new cropped images to Cloudinary
        const savedCroppedImages = [];
        for (const img of croppedImages) {
            try {
                const cloudinarImageUrl = await uploadBase64ImageToCloudinary(img);
                savedCroppedImages.push(cloudinarImageUrl);
            } catch (error) {
                console.log(`Error in uploading cropped images to Cloudinary: ${error}`);
            }
        }

        const product = await productSchema.findById(id);

        // Combine old and new images
        const newImages = [...product.productImage, ...savedCroppedImages];

        // Update the product in the database
        await productSchema.findByIdAndUpdate(id, {
            productName: req.body.name,
            productBrand: req.body.brand,
            productCategory: req.body.category,
            productDescription: req.body.productDescription,
            productPrice: req.body.productPrice,
            productImage: newImages,
            productVariants: variants,
        });

        req.flash('success', 'Product updated successfully!');
        res.redirect('/admin/products');
    } catch (error) {
        console.log(`Error in edit product post method: ${error}`);

        req.flash('error', 'Could not edit the product. Please try again.');
        res.redirect('/admin/products');
    }
};


// ----------------  status product -------------------
const status= async(req,res)=>{
    console.log(req.params.id);
    const { id } = req.params; 
    try {
        const product = await productSchema.findById(id);
        if (!product) {
            return res.status(404).send('product not found');
        }
        product.isActive = !product.isActive; 
        await product.save();
        res.redirect('/admin/products'); 
    }
    catch(error){
        console.error('Error toggling product status:', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports={
    loadProduct,
    loadAddProduct,
    addProductPost,
    loadEditProduct,
    editProductPost,
    status
}

