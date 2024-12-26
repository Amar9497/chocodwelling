const userSchema = require('../../model/userSchema');
const generateOTP = require('../../service/generateotp');
const sendOTP = require('../../service/emailsender');
const bcrypt = require('bcrypt');


//-----------------forgot password email page rendering------------------

const forgotPassword = (req,res)=>{
    try {
        req.session.user = ''
        res.render('user/forgotpassword',{
            title:'Forgot Password',
            user:req.session.user
        })
    }
    catch(error) {
        console.log(`Error in forgot password page rendering ${error}`);
    }
}

//-------------forgot password email page post method-----------------------

const forgotPasswordPost = async (req, res) => {
    try {
        // Check if email exists in the database
        const user = await userSchema.findOne({ email: req.body.email });
        if (!user) {
            req.flash('error', 'Sorry we cannot find you. Please Signup');
            return res.redirect('/signup');
        }

        // Check if the user is active
        if (!user.isActive) {
            req.flash('error', 'Access to this account is denied by Admin');
            return res.redirect('/login');
        }

        // Generate and send OTP
        const OTP = generateOTP();
        await sendOTP(req.body.email, OTP);

        // Save session data
        req.session.email = req.body.email;
        req.session.otp = OTP;
        req.session.otptimer = Date.now();

        // Redirect to OTP verification page
        res.redirect('/forgotPasswordOtp');
    } catch (error) {
        console.error(`Error in forgot password post method: ${error}`);
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/forgotpassword'); // Adjust redirect path as needed
    }
};

//-------------------------OTP page rendering--------------------------

const forgotPasswordOtp = async (req, res) => {
    try {
        // Validate session data
        if (!req.session.email || !req.session.otptimer) {
            req.flash('error', 'Session expired. Please try again.');
            return res.redirect('/forgotpassword'); // Redirect to forgot password page
        }

        // Render the OTP page with required session data
        res.render('user/forgotPasswordOtp', {
            title: 'Forget Password OTP',
            email: req.session.email,
            otpTime: req.session.otptimer,
            user: req.session.user || null, 
        });
    } catch (error) {
        console.error(`Error in rendering OTP page for forgot password: ${error}`);
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/forgotpassword'); 
    }
};

// --------------------------- OTP entering ----------------------------

const forgotPasswordOtpPost = async (req, res) => {
    try {
        // Securely compare OTPs
        const isOtpValid = req.session.otp === req.body.otp; 
        if (isOtpValid) {
            // Render reset password page
            res.render('user/resetPassword', {
                title: 'Reset Password',
                user: req.session.user || null, 
            });
        } else {
            // Handle invalid OTP
            req.flash('error', 'Invalid OTP');
            res.redirect('/forgotPasswordOtp');
        }
    } catch (error) {
        console.error(`Error in forgot password OTP post method: ${error}`);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/forgotpassword');
    }
};

// ------------------------------------------ reset password -----------------------------------------

const resetPasswordPost = async (req, res) => {
    try {

        // Ensure session email exists
        if (!req.session.email) {
            req.flash('error', 'Session expired. Please try again.');
            return res.redirect('/user/forgot-password');
        }

        const password = await bcrypt.hash(req.body.password,10);
        const update = await userSchema.updateOne({email:req.session.email},{password:password});

        if(update) {
            req.flash('success','Password updated Successfully');
            res.redirect('/login');
        } else {
            req.flash('error','Error in changing Password');
            res.redirect('/resetPassword');
        }   
    } catch (error) {
        console.error(`Error in reset password post method: ${error.message}`);
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/resetPassword');
    }
};

// ----------------------- resent opt -------------------

const forgotResend = async (req, res) => {
    try {
        // Validate session email
        const email = req.session.email;
        if (!email) {
            req.flash('error', 'Session expired. Please restart the process.');
            return res.redirect('/user/forgot-password');
        }

        // Generate and send OTP
        const otp = generateOTP();
        const otpSent = sendOTP(email, otp); // Assuming this is a synchronous function
        if (!otpSent) {
            req.flash('error', 'Failed to send OTP. Please try again later.');
            return res.redirect('/forgotPasswordOtp');
        }

        // Update session with new OTP and timer
        req.session.otp = otp;
        req.session.otptimer = Date.now();

        // Provide success feedback
        req.flash('success', 'A new OTP has been sent to your email.');
        res.redirect('/forgotPasswordOtp');
    } catch (error) {
        console.error(`Error in forgotResend function: ${error.message}`);
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/forgotPasswordOtp');
    }
};


module.exports={
    forgotPassword,
    forgotPasswordPost,
    forgotPasswordOtp,
    forgotPasswordOtpPost,
    resetPasswordPost,
    forgotResend
}
