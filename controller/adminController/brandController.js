const brandSchema = require("../../model/brandSchema");
const multer = require("multer");
const { storage } = require("../../service/cloudinary");

// -------------- brand page rendering ---------------
const loadBrand = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const search = req.query.search || "";

    // Sanitize search input to allow only letters
    const sanitizedSearch = search.replace(/[^a-zA-Z\s]/g, '');

    // Create search filter
    const filter = sanitizedSearch
      ? { brandName: { $regex: sanitizedSearch, $options: "i" } }
      : {};

    // Get total number of filtered brands
    const totalBrand = await brandSchema.countDocuments(filter);

    // Calculate total pages
    const totalPages = Math.ceil(totalBrand / itemsPerPage);

    // Ensure current page is within valid range
    const validatedPage = Math.max(1, Math.min(page, totalPages));
    const skip = (validatedPage - 1) * itemsPerPage;

    // Fetch paginated brands
    const brands = await brandSchema
      .find(filter)
      .sort({ createdAt: -1 })  // Add sorting if needed
      .skip(skip)
      .limit(itemsPerPage);

    // Render the page
    res.render("admin/brand", {
      title: "Brand",
      brands,
      currentPage: validatedPage,
      totalPages,
      search: sanitizedSearch,
      itemsPerPage
    });
  } catch (error) {
    console.error("Error rendering brand page:", error);
    res.status(500).render("admin/brand", {
      error: "An unexpected error occurred. Please try again.",
    });
  }
};

// -------------- add brnading --------------
const addBrand = async (req, res) => {
  try {
    const { brandName } = req.body;
    const imageUrl = req.file?.path;

    // Check if brandName and imageUrl are provided
    if (!brandName || !imageUrl) {
      req.flash("error", "Both brand name and image are required.");
      return res.redirect("/admin/brand");
    }

    // Check if the brand already exists (case-insensitive)
    const existingBrand = await brandSchema.findOne({
      brandName: { $regex: new RegExp("^" + brandName + "$", "i") },
    });

    if (existingBrand) {
      req.flash("error", "Brand already exists.");
      return res.redirect("/admin/brand");
    }

    // Create a new brand
    const newBrand = new brandSchema({
      brandName: brandName,
      brandImage: imageUrl,
      isActive: true,
    });

    // Save the new brand to the database
    await newBrand.save();

    req.flash("success", "Brand added successfully!");
    res.redirect("/admin/brand");
  } catch (error) {
    console.error("Error adding brand:", error);
    req.flash("error", "An unexpected error occurred. Please try again.");
    res.redirect("/admin/brand");
  }
};

// ---------------- edit brand --------------
const editBrand = async (req, res) => {
  try {
    const { brandId, brandName } = req.body;
    const imageUrl = req.file?.path;

    // Validate inputs
    if (!brandId || !brandName) {
      req.flash("error", "Brand ID and name are required.");
      return res.redirect("/admin/brand");
    }

    // Check if brand exists
    const existingBrand = await brandSchema.findById(brandId);
    if (!existingBrand) {
      req.flash("error", "Brand not found.");
      return res.redirect("/admin/brand");
    }

    // Check if new brand name already exists (excluding current brand)
    const duplicateBrand = await brandSchema.findOne({
      _id: { $ne: brandId },
      brandName: { $regex: new RegExp("^" + brandName + "$", "i") },
    });

    if (duplicateBrand) {
      req.flash("error", "Brand name already exists.");
      return res.redirect("/admin/brand");
    }

    // Update brand
    const updateData = {
      brandName: brandName,
    };

    // Only update image if new one is uploaded
    if (imageUrl) {
      updateData.brandImage = imageUrl;
    }

    await brandSchema.findByIdAndUpdate(brandId, updateData);

    req.flash("success", "Brand updated successfully!");
    res.redirect("/admin/brand");
  } catch (error) {
    console.error("Error updating brand:", error);
    req.flash("error", "An unexpected error occurred.");
    res.redirect("/admin/brand");
  }
};

//  --------------- brand status ----------
const statusBrand = async (req, res) => {
  //console.log(req.params)
  const { id } = req.params;
  try {
    // find the brand by id
    const brand = await brandSchema.findById(id);
    console.log(brand);
    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // isActive status
    brand.isActive = !brand.isActive;

    // Save the updated brand
    await brand.save();

    // redirect brand page
    res.redirect("/admin/brand");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadBrand,
  addBrand,
  editBrand,
  statusBrand,
};
