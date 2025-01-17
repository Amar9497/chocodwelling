const Order = require('../../model/orderSchema');
const userSchema = require('../../model/userSchema');
const Product = require('../../model/productSchema');


// admin login
const loadLogin = (req, res) => {
  try {
    if(req.session.admin){
      res.redirect('/admin/home');
    } else {
      res.render('admin/login', {
        title: 'Admin Login'
      });
    }
  } catch (error) {
    console.log(error);
    req.flash("error", "Error Occurred");
    res.render('admin/login', {
      title: 'Admin Login'
    });
  }
};

// --------------------- admin login post request -------------------------------

const loadLoginPost = (req, res) => {
  try {
    if (
      req.body.email === process.env.ADMIN_EMAIL &&
      req.body.password === process.env.ADMIN_PASSWORD
    ) {
      req.session.admin = req.body.email;
      req.flash("success", "Login Successful");
      res.redirect("/admin/home");
      // console.log(req.flash('success'))
    } else {
      req.flash("error", "Invalid Credentials");
      res.redirect("/admin/login");
      // console.log(req.flash('error'))
    }
  } catch (error) {
    console.log(`Error in login post: ${error}`);
    req.flash("error", "Internal Server Error");
    res.redirect("/admin/login");
  }
};

// admin dashboard

const loadHome = async(req, res) => {
  try {
    const timeFrame = req.query.timeFrame || 'yearly'; // Default to yearly
    
    // Base match condition for non-cancelled/returned orders
    const baseMatch = {
      orderStatus: { $nin: ["Cancelled", "Returned"] }
    };

    // Add date filter based on timeFrame
    const now = new Date();
    if (timeFrame === 'monthly') {
      baseMatch.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1)
      };
    } else if (timeFrame === 'weekly') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      baseMatch.createdAt = { $gte: lastWeek };
    } else if (timeFrame === 'daily') {
      baseMatch.createdAt = {
        $gte: new Date(now.setHours(0, 0, 0, 0))
      };
    }

    // Get basic order stats
    const orders = await Order.find(baseMatch).populate("userId", "name");
    const user = await userSchema.countDocuments({});

    // Calculate total products sold
    const productResult = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$products.quantity" }
        }
      }
    ]);

    // Get sales data for chart
    const salesData = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: timeFrame === 'daily' ? '%H:00' : 
                      timeFrame === 'weekly' ? '%Y-%m-%d' : 
                      timeFrame === 'monthly' ? '%Y-%m-%d' : '%Y-%m',
              date: "$createdAt"
            }
          },
          totalSales: { $sum: "$finalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get top 10 selling products with proper product details
    const topProducts = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          name: "$productDetails.productName",
          totalQuantity: 1,
          totalRevenue: 1,
          rating: "$productDetails.ratings.average"
        }
      }
    ]);

    // Get top 10 categories with proper category names
    const topCategories = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.productCategory",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.categoryName" },
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Get top 10 brands with proper brand names
    const topBrands = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "brands",
          localField: "product.productBrand",
          foreignField: "_id",
          as: "brand"
        }
      },
      { $unwind: "$brand" },
      {
        $group: {
          _id: "$brand._id",
          brandName: { $first: "$brand.brandName" },
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    const summary = {
      totalOrders: orders.length,
      finalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
      productCount: productResult.length > 0 ? productResult[0].totalQuantity : 0
    };

    res.render("admin/dashboard", {
      title: "Admin Home",
      summary,
      user,
      salesData,
      topProducts,
      topCategories,
      topBrands,
      timeFrame
    });

  } catch (error) {
    console.log(error);
    req.flash("error", "Error Occurred");
    res.redirect("/admin/login");
  }
};

// ------------------------------ admin logout --------------------------

const logout = (req, res) => {
  try {
    req.session.admin = null;
    req.flash("success", "Logged out successfully");
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error);
    req.flash("error", "Error Occurred");
    res.redirect("/admin/login");
  }
};

module.exports = {
  loadHome,
  loadLogin,
  loadLoginPost,
  logout,
};
