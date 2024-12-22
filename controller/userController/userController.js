const userSchema = require('../../model/userSchema');
const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const brandSchema = require('../../model/brandSchema');
const bcrypt = require('bcrypt');
const saltround = 10;

const passport = require('../../service/auth');
const sendOTP = require('../../service/emailsender');
const generateOTP = require('../../service/generateotp')




// ------------- login page render ------------------
const loadLogin=(req,res)=>{
    try {
        res.render("user/login",{title: 'Login'})
    } catch (error) {
        res.status(500).send("error occured")
    }
}

// ---------------- login post -------------------
const loginPost = async (req, res) => {
    try {
        //console.log(req.body); 
        const user = await userSchema.findOne({ email: req.body.email }); // Fetch user by email

        if (!user) {
            req.flash('error', 'Could not find user, please login again');
            return res.redirect('/login'); // Early return if user not found
        }

        if (!user.isActive) {
            req.flash('error', 'User is blocked by admin');
            return res.redirect('/login'); // Early return if user is blocked
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email ID or password');
            return res.redirect('/login'); // Early return if password is invalid
        }

        // User authenticated successfully
        req.session.user = user.id; // Store user ID in session
        return res.redirect('/home');
        
    } catch (error) {
        console.error('Error during login:', error); // Log the error for debugging
        req.flash('error', 'An unexpected error occurred. Please try again.');
        res.redirect('/login');
    }
};

//--------------------google login----------------

const googleAuth = (req, res, next) => {
    try {
        passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, next);
    } catch (error) {
        console.error(`Error in user Google login: ${error.message}`);
        res.status(500).send("An error occurred while processing your request. Please try again.");
    }
};


//----------------google auth callback-------------

const googleAuthCallback = (req, res, next) => {
    try {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error(`Error on Google auth callback: ${err.message}`);
                req.flash('error', 'An error occurred during authentication. Please try again.');
                return res.redirect('/login');
            }

            if (!user) {
                req.flash('error', 'User not found. Please sign up or try again.');
                return res.redirect('/login');
            }

            if (!user.isActive) {
                req.flash('error', 'User access is blocked by admin.');
                return res.redirect('/login');
            }

            // Log the user in
            req.login(user, (loginErr) => {
                if (loginErr) {
                    console.error(`Error during user login: ${loginErr.message}`);
                    return next(loginErr); // Pass error to global error handler
                }
                req.session.user = user.id; // Store user ID in session
                res.redirect('/home'); // Redirect to home page
            });
        })(req, res, next); // Call the passport authenticate middleware
    } catch (error) {
        console.error(`Unexpected error in Google callback: ${error.message}`);
        res.status(500).send("An unexpected error occurred. Please try again.");
    }
};



// --------------- signup page render -------------
const loadSignup=(req,res)=>{
    try {
      res.render("user/signup",{
        title: 'Signup',
        user:req.session.user

    })  
    } catch (error) {
        res.status(500).send("page not found")
    }
}

// -------------- singup post -----------------------
const singupPost = async(req,res)=>{
    //console.log(req.body);
    try {
        const details = {
            name:req.body.name,
            email:req.body.email,
            password: await bcrypt.hash(req.body.password,saltround),
            phone:req.body.phone
        }
        //console.log(details)
        const check = await userSchema.findOne({email:details.email})
        //console.log(check);
        if(check){
            console.log('User already exists')
            req.flash('error','User already exists');
            res.redirect('/signup');
        } else{
            const OTP = generateOTP();
            sendOTP(details.email,OTP);
            req.flash('success',`OTP send to the ${details.email}`);

            req.session.otp = OTP;
            req.session.otptime = Date.now();
            req.session.email = details.email;
            req.session.name = details.name;
            req.session.phone = details.phone;
            req.session.password = details.password;

            res.redirect('/otp');    
            
        }
        
    } catch (error) {
        console.log(`error in user signup post ${error}`);
    }
}

// ---------------------- otp page render -----------------------

const otp = (req,res)=>{
    try {
        res.render('user/otppage',{
            title: 'OTP verify',
            user:req.session.user,
            email: req.session.email,
            otpTime: req.session.otptime,

        });
    } catch (error) {
        console.log(`error while rendering OTP page ${error}`);
    }
}

// -------------------- geting otp from user ---------------------------

const otpPost = async (req, res) => {
    console.log(`Session OTP: ${req.session.otp}`);
    try {
        const details = {
            name: req.session.name,
            email: req.session.email,
            password: req.session.password,
            phone: req.session.phone
        };
        const otpEntered = req.body.otp;
        console.log(`Session OTP: ${req.session.otp}, Entered OTP: ${otpEntered}`);

        if (!req.session.otp) {
            req.flash('error', 'OTP session expired. Please request a new one.');
            return res.redirect('/otp');
        }

        if (req.session.otp.toString() === otpEntered.toString()) {
            console.log('OTP verified');
            req.flash('success', 'OTP Verified');

             // Create a new user and store the returned document
            const user = await userSchema.create(details);
            console.log('New user registered successfully:', user);

            req.flash('success', 'New user registered successfully');
            
            // Clear session data after success
            req.session.otp = null;
            req.session.otptime = null;
            req.session.name = null;
            req.session.email = null;
            req.session.password = null;
            req.session.phone = null;

            req.session.user = user.id;
            res.redirect('/home');
        } else {
            req.flash('error', 'Invalid OTP. Please try again.');
            res.redirect('/otp');
        }
    } catch (error) {
        console.log(`Error while verifying OTP: ${error}`);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/otp');
    }
};


// ------------------- resend otp ------------------
const otpResend = (req,res)=>{
    try {
        const email = req.session.email;
        const OTP = generateOTP();
        sendOTP(email,OTP);

        req.session.otp = OTP;
        req.session.otpTime = Date.now();

        req.flash('success','OTP resend successfully');
        res.redirect('/otp');

    }
    catch (error){
        console.log(`error while resend otp ${error}`);
    }
}

// ------------ home -----------------

const home = async (req, res) => {
    try {
        // Fetch only active and not blocked brands
        const brand = await brandSchema.find({ isActive: true, isBlocked: { $ne: true } });

        // Fetch only active and not blocked categories
        const activeCategories = await categorySchema.find({ isActive: true, isBlocked: { $ne: true } }).select('_id');

        // Extract the IDs of active categories
        const activeCategoryIds = activeCategories.map(category => category._id);

        // Fetch active products that belong to active categories, are not blocked, and are recently launched (e.g., added in the last 30 days)
        const newLaunches = await productSchema.find({
            isActive: true,  // Only include active products
            isBlocked: { $ne: true },  // Exclude blocked products
            productCategory: { $in: activeCategoryIds }, // Filter products by active category IDs
            productBrand: { $nin: brand.filter(b => b.isBlocked).map(b => b._id) } // Exclude products with blocked brands
        })
        .sort({ createdAt: -1 })  // Sort by creation date in descending order (most recent first)
        .limit(5); // Limit to the 5 most recent products (you can change this number)

        // Fetch other products for the main display (non-new launches)
        const product = await productSchema.find({
            isActive: true,  // Only include active products
            isBlocked: { $ne: true },  // Exclude blocked products
            productCategory: { $in: activeCategoryIds } // Filter products by active category IDs
        });

        res.render('user/homepage', {
            title: 'Home Page',
            user: req.session.user,
            brand,
            product,
            newLaunches // Pass the new launches to the view
        });
    } catch (error) {
        console.log(`Error in home function: ${error}`);
        res.status(500).send('Internal Server Error');
    }
};




// ---------------- logout ----------------

const logout = (req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/login');
    } catch (error) {
        console.log(error)
        res.status(500).send("Error occured")
    }
}

module.exports={
    loadSignup,
    loadLogin,
    singupPost,
    otp,
    otpPost,
    otpResend,
    loginPost,
    googleAuth,
    googleAuthCallback,
    home,
    logout
}