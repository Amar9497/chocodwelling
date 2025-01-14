const productSchema = require("../../model/productSchema");
const categorySchema = require("../../model/categorySchema");
const brandSchema = require("../../model/brandSchema");
const { render } = require("ejs");
const cloudinary = require("cloudinary").v2;

// ------------ product page rendering -------------

const loadProduct = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const itemsPerPage = 10;
  const search = req.query.search || "";

  try {
    // search filter
    const filter = search
      ? { productName: { $regex: search, $options: "i" } }
      : {};

    const totalProduct = await productSchema.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalProduct / itemsPerPage), 1);
    const currentPage = Math.min(page, totalPages);

    const skip = Math.max((currentPage - 1) * itemsPerPage, 0);

    const products = await productSchema
      .find(filter)
      .populate("productCategory", "categoryName")
      .skip(skip)
      .limit(itemsPerPage)
      .sort({ updatedAt : -1 });

    res.render("admin/products", {
      title: "Products",
      products,
      currentPage,
      totalPages,
      search,
    });
  } catch (error) {
    console.error(`Error in loadProduct: ${error}`);
    req.flash("error", "Failed to load products.");
    res.status(500).render("admin/products", {
      title: "Products",
      products: [],
      currentPage: 1,
      totalPages: 1,
      messages: req.flash(),
    });
  }
};

// ------------ add product page rendering ------------

const loadAddProduct = async (req, res) => {
  try {
    const category = await categorySchema.find();
    const brand = await brandSchema.find();
    res.render("admin/addproduct", {
      title: "Products",
      category,
      brand,
    });
  } catch (error) {
    console.log(error);
  }
};

const uploadBase64ImageToCloudinary = async (base64Data) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64Data,
      { folder: "upload" },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
  });
};

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

    // Fetch the category and brand
    const category = await categorySchema.findOne({
      categoryName: req.body.category,
    });
    const brand = await brandSchema.findOne({ brandName: req.body.brand });

    if (!category) {
      req.flash("error", "Category does not exist!");
      return res.redirect("/admin/addproduct");
    }

    const product = {
      productName: req.body.name,
      productBrand: brand._id,
      productCategory: category._id,
      productDescription: req.body.description,
      productVariants: [
        {
          weight: req.body.weight,
          price: req.body.price,
          stock: req.body.stock,
        },
      ],
      productImage: isArray,
    };

    console.log(product);

    // Check if product already exists
    const check = await productSchema.findOne({
      productName: product.productName,
      productCategory: product.productCategory,
    });

    if (!check) {
      // Product doesn't exist, add to database
      await productSchema.insertMany(product);

      req.flash("success", "Product successfully added!");
    } else {
      req.flash("error", "Product already exists!");
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.log(`Error in add product post: ${error}`);

    req.flash("error", "Failed to add product. Please try again.");

    res.redirect("/admin/addproduct");
  }
};

// -------------------- edit product page redering----------------
const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;

    // Fetch the product and populate both productCategory and productBrand fields
    const products = await productSchema
      .findById(id)
      .populate("productCategory")
      .populate("productBrand"); 

    const category = await categorySchema.find();
    const brand = await brandSchema.find();

    if (products) {
      res.render("admin/editproduct", {
        title: "Edit Product",
        products,
        category,
        brand,
      });
    } else {
      req.flash("error", "Unable to edit product");
      res.redirect("/admin/products");
    }
  } catch (error) {
    console.log(`Error in rendering edit product page: ${error}`);
    req.flash("error", "Something went wrong.");
    res.redirect("/admin/products");
  }
};

// ---------------------- edit product --------------------

const editProductPost = async (req, res) => {
  try {
    const id = req.params.id;
    const imageToDelete = JSON.parse(req.body.deletedImages || "[]");
    const croppedImages = JSON.parse(req.body.croppedImages || "[]");
    const variants = [
      {
        weight: req.body.weight,
        price: req.body.price,
        stock: req.body.stock,
      },
    ];


    const category = await categorySchema.findById(req.body.category);
    const brand = await brandSchema.findById(req.body.brand);

    if (!category) {
      console.log(`Category not found: ${req.body.category}`);
      req.flash("error", "Category does not exist!");
      return res.redirect(`/admin/editproduct/${id}`);
    }

    if (!brand) {
      console.log(`Brand not found: ${req.body.brand}`);
      req.flash("error", "Brand does not exist!");
      return res.redirect(`/admin/editproduct/${id}`);
    }


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
        $pull: { productImage: { $in: imageToDelete } },
      });
    }

    // Upload the new cropped images to Cloudinary
    const savedCroppedImages = [];
    for (const img of croppedImages) {
      try {
        const cloudinaryImageUrl = await uploadBase64ImageToCloudinary(img);
        savedCroppedImages.push(cloudinaryImageUrl);
      } catch (error) {
        console.log(
          `Error in uploading cropped images to Cloudinary: ${error}`
        );
        req.flash("error", "Error uploading cropped images.");
        return res.redirect(`/admin/editproduct/${id}`);
      }
    }

    const product = await productSchema.findById(id);
    if (!product) {
      req.flash("error", "Product not found!");
      return res.redirect("/admin/products");
    }

    // Combine old and new images
    const newImages = [...product.productImage, ...savedCroppedImages];

    // Update the product in the database
    await productSchema.findByIdAndUpdate(id, {
      productName: req.body.name,
      productBrand: brand._id,
      productCategory: category._id,
      productDescription: req.body.productDescription,
      productPrice: req.body.productPrice,
      productImage: newImages,
      productVariants: variants,
    });

    req.flash("success", "Product updated successfully!");
    res.redirect("/admin/products");
  } catch (error) {
    console.log(`Error in edit product post method: ${error}`);
    req.flash("error", "Could not edit the product. Please try again.");
    res.redirect(`/admin/editproduct/${req.params.id}`);
  }
};

// ----------------  status product -------------------
const status = async (req, res) => {
  //console.log(req.params.id);
  const { id } = req.params;
  try {
    const product = await productSchema.findById(id);
    if (!product) {
      return res.status(404).send("product not found");
    }
    product.isActive = !product.isActive;
    await product.save();
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error toggling product status:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadProduct,
  loadAddProduct,
  addProductPost,
  loadEditProduct,
  editProductPost,
  status,
};
