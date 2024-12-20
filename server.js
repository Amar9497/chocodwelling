//requiring modules
const express=require('express');
const app=express();
const path=require('path');
require('dotenv').config();
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts')
const multer = require('multer');
const passport = require('passport');
const nocache = require('nocache');

//port number
const port= process.env.PORT ||3000;

//admin routes
const adminRoutes=require("./routes/admin");
//user routes
const userRoutes=require('./routes/user');
//db routes
const connectDB=require('./db/connectDB');

// Connect to MongoDB
connectDB();

//--------------------Serving Static Files---------------------
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/public',express.static(path.join(__dirname,'public')));

//set layout
app.use(expressLayouts);
app.set('layout','./layout/layout')

//url encoded data
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Set EJS template engine
app.set('view engine', 'ejs');
// flash
app.use(flash())

// Define the views directory (optional, defaults to './views')
app.set('views', path.join(__dirname, 'views'));

// nocache
app.use(nocache());

// session
app.use(session({
  secret:"secretKey",
  resave:false,
  saveUninitialized:true,
  cookie:{
      maxAge: 24 * 60 * 60 * 1000, 
      secure: false, 
      httpOnly: true 
  }
}));

// flash message
app.use((req,res,next)=>{
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error')
    next();
})

// -------- passport ----------

app.use(passport.initialize());
app.use(passport.session());

// Setup multer for image uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// routes
app.use('/admin',adminRoutes);
app.use('/',userRoutes);

app.get('/',(req,res)=>{
  try{
      res.redirect('/home');
  }
  catch(err){
      console.log(`Error occured ${err}`);
  }
})

//---------------------- 404 page render ------------------------

app.use("*",(req,res)=>{
    res.render('pageNotFound',{title:"Page not found"})
})

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`)
})
