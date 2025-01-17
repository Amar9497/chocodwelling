//requiring modules
const express=require('express');
const app=express();
const path=require('path');
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts')
const multer = require('multer');
const passport = require('passport');
const nocache = require('nocache');

//port number
const port= process.env.PORT ||3030;

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


app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!'
    });
});

// Set EJS template engine
app.set('view engine', 'ejs');

// Flash messages
app.use(flash());

// Define the views directory (optional, defaults to './views')
app.set('views', path.join(__dirname, 'views'));

// nocache
app.use(nocache());

// session
const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URL,
    ttl: 24 * 60 * 60, // 1 day
    autoRemove: 'native',
    touchAfter: 24 * 3600,
    collectionName: 'sessions'
});

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,  // Changed to true
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        secure: false,  // Set to false in development
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax'
    },
    rolling: true  // Refresh cookie on every response
}));

// Development Mode Hot Reload Handler
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        if (req.session && req.session.user) {
            // Refresh session on each request in development
            req.session.touch();
        }
        next();
    });
}



// Global variables middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.admin = req.session.admin || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});




// Example middleware to differentiate sessions
app.use((req, res, next) => {
    if (!req.session.user) req.session.user = null;
    if (!req.session.admin) req.session.admin = null;
    next();
});

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

app.use((req, res, next) => {
    console.log('Flash Messages:', {
        success: req.flash('success'),
        error: req.flash('error')
    });
    next();
});

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`)
})