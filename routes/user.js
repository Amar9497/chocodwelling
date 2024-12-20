const express=require("express")
const user=express.Router();
const passport=require("passport")
const userController=require('../controller/userController/userController');
const categoryController=require('../controller/userController/categoryController');
const productController= require('../controller/userController/productController');
const auth = require('../middleware/userSession')

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

// --------------------- home -----------------------------

user.get('/home',auth.isCheck,userController.home);

// ------------------- category -----------------------

user.get('/category',auth.isCheck,categoryController.categoryget);

// --------------------- product -------------------------

user.get('/allproduct',auth.isCheck,productController.allProduct);

user.get('/productDetail/:id',auth.isCheck,productController.productDetail);

// --------------------- logout --------------------

user.get('/logout',auth.isCheck,userController.logout);


module.exports= user ;