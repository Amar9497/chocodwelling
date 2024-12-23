const express=require("express");
const user=express.Router();
const passport=require("passport");
const userController=require('../controller/userController/userController');
const categoryController=require('../controller/userController/categoryController');
const productController= require('../controller/userController/productController');
const forgotPasswordController = require('../controller/userController/forgotPassworController');
const profileController = require('../controller/userController/profileController');
const cartController = require('../controller/userController/cartController');
const checkOutSchema = require('../controller/userController/checkOutController');
const orderController = require('../controller/userController/orderController');
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

// --------------------- home -----------------------------

user.get('/home',userController.home);

// ------------------- profile ---------------------------- 

user.get('/profile',auth.isCheck,profileController.profile);

user.post('/updateProfile',profileController.updateProfile);

user.post('/add-address',profileController.addAddress);

user.get('/remove-address/:index', profileController.removeAddress);

user.post('/updateaddress/:index',profileController.updateAddress);

user.post('/reset-password',profileController.resetPassword);

// ------------------------ cart ---------------------------------

user.get('/cart',cartController.cart);

user.post('/addToCart',cartController.addToCart);

user.post('/updateCart',cartController.updateCart);

user.post('/removeFromCart',cartController.removeFromCart);

// ------------------------- check out -----------------------------

user.get('/checkout',checkOutSchema.checkout);

user.post('/checkout-address',checkOutSchema.addAddress);

user.post('/place-order',checkOutSchema.placeOrder);

// ------------------------- order ---------------------------------

user.get('/orders',orderController.orderPage);

user.post('/cancelOrder/:orderId', orderController.cancelOrder);

user.get('/orderDetail/:id', orderController.orderDetails);

// ------------------------ category -------------------------------

user.get('/category',auth.isCheck,categoryController.categoryget);

// ------------------------- product -------------------------------

user.get('/allproduct',auth.isCheck,productController.allProduct);

user.get('/productDetail/:id',auth.isCheck,productController.productDetail);

// ------------------------- logout --------------------------------

user.get('/logout',auth.isCheck,userController.logout);


module.exports= user ;