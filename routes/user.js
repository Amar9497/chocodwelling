const express=require("express");
const user=express.Router();
const passport=require("passport");
const userController=require('../controller/userController/userController');
const categoryController=require('../controller/userController/categoryController');
const productController= require('../controller/userController/productController');
const forgotPasswordController = require('../controller/userController/forgotPassworController');
const profileController = require('../controller/userController/profileController');
const cartController = require('../controller/userController/cartController');
const checkOutController = require('../controller/userController/checkOutController');
const orderController = require('../controller/userController/orderController');
const wishlistController = require('../controller/userController/wishlistController');
const walletController = require('../controller/userController/walletController');
const brandController = require('../controller/userController/brandContrller');
const reviewController = require('../controller/userController/reviewController');


const auth = require('../middleware/userSession');

// -------------------- login --------------------
user.get('/login',auth.isLogin,userController.loadLogin);

user.post('/login',userController.loginPost);

// ------------- google login ------------

user.get('/auth/google',userController.googleAuth);

user.get('/auth/google/callback', userController.googleAuthCallback);

// -------------------- signup ---------------

user.get('/signup',userController.loadSignup);

user.post('/signup',userController.singupPost);

// -------------------- otp ------------------

user.get('/otp',userController.otp);

user.post('/otp',userController.otpPost);

user.get('/resendotp',userController.otpResend);

// ------------------- forgot password ---------------

user.get('/forgotpassword',forgotPasswordController.forgotPassword);

user.post('/forgotpassword',forgotPasswordController.forgotPasswordPost);

user.get('/forgotPasswordOtp',forgotPasswordController.forgotPasswordOtp);

user.post('/forgotPasswordOtp',forgotPasswordController.forgotPasswordOtpPost);

user.post('/resetPassword',forgotPasswordController.resetPasswordPost);

user.get('/forgotpassword-resendotp',forgotPasswordController.forgotResend)

// ----------------------- home -----------------------------

user.get('/home',userController.home);



// ------------------------ profile ------------------------------ 

user.get('/profile',auth.isCheck,profileController.profile);

user.post('/updateProfile',auth.isCheck,profileController.updateProfile);

user.post('/add-address',auth.isCheck,profileController.addAddress);

user.get('/remove-address/:index',auth.isCheck,profileController.removeAddress);

user.post('/updateaddress/:index',auth.isCheck,profileController.updateAddress);

user.post('/reset-password',auth.isCheck,profileController.resetPassword);

// ------------------------ cart ---------------------------------

user.get('/cart',auth.isCheck,cartController.cart);

user.post('/addToCart',auth.isCheck,cartController.addToCart);

user.post('/updateCart',auth.isCheck,cartController.updateCart);

user.post('/removeFromCart',auth.isCheck,cartController.removeFromCart);

// ------------------------- check out -----------------------------

user.get('/checkout',auth.isCheck,checkOutController.checkout);

user.post('/checkout-address',auth.isCheck,checkOutController.addAddress);

user.post('/place-order',auth.isCheck,checkOutController.placeOrder);

user.post('/create-razorpay-order',checkOutController.createRazorpayOrder);

user.post('/verify-payment',checkOutController.verifyPayment);

user.post('/validate-coupon', checkOutController.validateCoupon);

user.post('/cancel-razorpay-order', checkOutController.cancelRazorpayOrder);


// ------------------------- order ---------------------------------

user.get('/orders',auth.isCheck,orderController.orderPage);

user.post('/cancelOrder/:orderId',auth.isCheck,orderController.cancelOrder);

user.post('/return-order/:orderId', auth.isCheck, orderController.returnOrder);

user.get('/orderDetail/:id',auth.isCheck,orderController.orderDetails);

user.get('/order/:orderId/invoice', auth.isCheck, orderController.generateInvoice);

user.post('/retry-payment', auth.isCheck, orderController.retryPayment);

user.post('/verify-retry-payment', auth.isCheck, orderController.verifyRetryPayment);

user.post('/update-payment-status', orderController.updatePaymentStatus);






// ------------------------ category -------------------------------

user.get('/category',auth.isCheck,categoryController.categoryget);

user.get('/category/:id', categoryController.getCategoryProducts);


// ----------------------- brand -----------------------------------

user.get('/brand/:id', brandController.getBrandProducts);

// ------------------------- product -------------------------------

user.get('/allproduct',auth.isCheck,productController.allProduct);

user.get('/productDetail/:id',auth.isCheck,productController.productDetail);


// ------------------------ Review -------------------------------------

// Review routes
user.post('/product/:productId/review',auth.isCheck,reviewController.addReview);

user.get('/product/:productId/all-reviews', reviewController.getAllReviews);



// ------------------------- wishlist -------------------------------

user.get('/wishlist',auth.isCheck,wishlistController.wishlistpage);

user.get('/add-wishlist/:id',auth.isCheck,wishlistController.addWishlist);

user.delete('/delete-wish/:id',auth.isCheck,wishlistController.deleteWishlist );


// ------------------------- wallet ------------------------------

user.get('/wallet',auth.isCheck,walletController.walletPage);

// ------------------------- logout --------------------------------

user.get('/logout',auth.isCheck,userController.logout);



module.exports= user ;