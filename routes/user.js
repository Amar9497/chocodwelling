const express=require("express")
const user=express.Router();
const passport=require("passport")
const userController=require('../controller/userController/userController');
const categoryController=require('../controller/userController/categoryController');
const productController= require('../controller/userController/productController');

// -------------------- login --------------------
user.get('/login',userController.loadLogin);

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

// --------------------- home -----------------------------

user.get('/home', userController.home);

// ------------------- category -----------------------

user.get('/category',categoryController.categoryget);

// ------------ product -----------------------

user.get('/allproduct',productController.allProduct);

user.get('/productDetail/:id',productController.productDetail);


module.exports= user ;