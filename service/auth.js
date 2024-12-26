const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv').config();
const userSchema = require('../model/userSchema'); 

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true, // Gives access to request in callback
        },
        async (request, accessToken, refreshToken, profile, done) => {
            try {
                // Extract user email
                const email = profile.emails?.[0].value;

                // Check if user already exists
                let user = await userSchema.findOne({ email });

                if (!user) {
                    // If user does not exist, create a new one
                    user = new userSchema({
                        name: profile.displayName,
                        email: email,
                        googleID: profile.id, // Save Google ID
                    });
                    await user.save();
                }
                if(!user.googleID){
                    user.googleID = profile.id
                }

                // Pass user to the done function
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user ID into session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user by ID
passport.deserializeUser(async (id, done) => {
    try {
        const user = await userSchema.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
