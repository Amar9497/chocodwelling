const express = require('express');
const admin = express.Router();

const adminController = require('../controller/adminController/adminController');
const productController = require('../controller/adminController/productController');
const categoryController = require('../controller/adminController/categoryController');
const brandController = require('../controller/adminController/brandController');
const userController = require('../controller/adminController/userController');
const orderController = require('../controller/adminController/orderController');
const offerController = require('../controller/adminController/offerController');
const couponController = require('../controller/adminController/couponController');
const saleController = require('../controller/adminController/saleController');
const { upload } = require('../service/cloudinary');
const auth = require('../middleware/adminSession');


// -------------------- admin login --------------------

admin.get('/login',adminController.loadLogin);

admin.post('/login',adminController.loadLoginPost)

// -------------------- admin dashboard -----------------

admin.get('/home',auth.isAdmin,adminController.loadHome);


// ------------------------- sales --------------------------------

admin.get('/salesReport',auth.isAdmin,saleController.salePage);

admin.post('/sales-report',auth.isAdmin,saleController.generateReport);

admin.post('/download-report', auth.isAdmin, saleController.downloadReport);


// -------------------- admin products -------------------

admin.get('/products',auth.isAdmin,productController.loadProduct);

admin.get('/addproduct',auth.isAdmin,productController.loadAddProduct);

admin.post('/addproduct',auth.isAdmin,upload.array('images', 4),productController.addProductPost);

admin.get('/editproduct/:id',auth.isAdmin,productController.loadEditProduct);

admin.post('/editproduct/:id',auth.isAdmin,upload.array("images", 4),productController.editProductPost);

admin.post('/statusproduct/:id',auth.isAdmin,productController.status);


// --------------------- admin category -----------------

admin.get('/category',auth.isAdmin,categoryController.loadCategory);

admin.post('/addcategory',auth.isAdmin,categoryController.addCategoryPost);

admin.post('/editcategory',auth.isAdmin,categoryController.editCategory);

admin.post('/status/:id/',auth.isAdmin,categoryController.status);

// --------------------- admin brand ---------------------

admin.get('/brand',auth.isAdmin,brandController.loadBrand);

admin.post('/addbrand',auth.isAdmin,upload.single("brandImage"),brandController.addBrand);

admin.post('/editbrand',auth.isAdmin,upload.single('brandImage'),brandController.editBrand);

admin.post('/statusbrand/:id',auth.isAdmin,brandController.statusBrand);

// --------------------- admin customer -------------------

admin.get('/customers',auth.isAdmin,userController.loadCustomers);

admin.get('/customerstatus',auth.isAdmin,userController.status);


// ----------------------- orders ------------------------

admin.get('/orders',auth.isAdmin,orderController.orderPage);

admin.post('/order/:orderId/status',auth.isAdmin,orderController.orderStatus);

admin.get('/order-view/:id',auth.isAdmin,orderController.orderView);

admin.get('/orders/:orderId/return-details', auth.isAdmin, orderController.getReturnDetails);

admin.post('/orders/:orderId/return-status', auth.isAdmin, orderController.updateReturnStatus);

// ----------------------- offer --------------------------

admin.get('/offer',auth.isAdmin,offerController.getOffer);

admin.post('/addOffer',auth.isAdmin,offerController.addOffer);

admin.post('/editOffer',auth.isAdmin,offerController.editOffer);

admin.get('/offerStatus',auth.isAdmin,offerController.offerStatus);

// ---------------------- coupon --------------------------

admin.get('/coupons/:id?',auth.isAdmin,couponController.getCoupons);

admin.post('/addcoupon',auth.isAdmin,couponController.addCoupon);

admin.post('/editcoupon/:id',auth.isAdmin,couponController.editCoupon);

admin.get('/statuscoupon',auth.isAdmin,couponController.toggleCouponStatus);



//-------------------------Logout--------------------------

admin.get('/logout',adminController.logout);


module.exports=admin;