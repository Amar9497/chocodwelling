const userSchema = require('../../model/userSchema');
const addressSchema = require('../../model/addressSchema');
const bcrypt = require('bcrypt');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId; //


// -------------- profile page rendering -----------------

const profile = async (req, res) => {
    try {
        const userId = req.session.user;

        const userDetail = await userSchema.findById(userId);
        if (!userDetail) {
            req.flash('error', 'Profile not found. Please try again later.');
            return res.redirect('/home');
        }

        res.render('user/profile', {
            title: 'My Profile',
            user: req.session.user,
            userDetail,
        });
    } catch (error) {
        console.error(`Error in rendering user profile page for userId: ${req.session.user}. Details: ${error.message}`);
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/home'); 
    }
};

// --------------------------------- profile updating -----------------------------

const updateProfile = async (req, res) => {
    try {
        const  userName = req.body.userName; 
        const phoneNumber = req.body.phoneNumber;
        
        // Update profile
        const profileUpdate = await userSchema.findByIdAndUpdate(
            req.session.user,
            { name: userName, phone: phoneNumber },
            { new: true } 
        );

        if (profileUpdate) {
            req.flash('success', `Profile updated successfully! Name: ${profileUpdate.name}, Phone: ${profileUpdate.phone}`);
        } else {
            req.flash('error', 'Could not update the profile. Please try again later.');
        }
        res.redirect('/profile');
    } catch (error) {
        console.error(`Error in updateProfile: ${error.message}`);
        req.flash('error', 'Something went wrong while updating your profile. Please try again later.');
        res.redirect('/profile');
    }
};

//------------------Address management in user profile--------------------------

const addAddress = async (req, res) => {
    try {
        const userAddress = {
            building: req.body.building.trim(),
            street: req.body.street.trim(),
            city: req.body.city.trim(),
            phoneNumber: req.body.phonenumber.trim(),
            pincode: req.body.pincode.trim(),
            landmark: req.body.landmark.trim(),
            state: req.body.state.trim(),
            country: req.body.country.trim(),
        };

        // Basic validation for required fields
        if (!userAddress.building || !userAddress.city || !userAddress.pincode) {
            req.flash('error', 'Building, City, and Pincode are required fields.');
            return res.redirect('/profile');
        }

        const user = await userSchema.findById(req.session.user);

        if (!user) {
            req.flash('error', 'User not found. Please log in again.');
            return res.redirect('/login');
        }

        // Check address limit
        if (user.address.length >= 4) {
            req.flash('error', 'Maximum address limit reached. Please delete an address before adding a new one.');
            return res.redirect('/profile');
        }

        // Add new address
        user.address.push(userAddress);
        await user.save();

        req.flash('success', 'Address added successfully!');
        res.redirect('/profile');
    } catch (error) {
        console.error(`Error in addAddress: ${error.message}`);
        req.flash('error', 'Something went wrong while adding the address. Please try again later.');
        res.redirect('/profile');
    }
};

//---------------------remove address--------------------

const removeAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const index = parseInt(req.params.index, 10);

        // Validate index parameter
        if (isNaN(index)) {
            req.flash('error', 'Invalid request. Address index must be a number.');
            return res.redirect('/profile');
        }

        const user = await userSchema.findById(userId);

        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/profile');
        }

        if (index < 0 || index >= user.address.length) {
            req.flash('error', 'Invalid address selection.');
            return res.redirect('/profile');
        }

        // Remove address
        user.address.splice(index, 1);
        await user.save();

        req.flash('success', 'Address deleted successfully.');
        res.redirect('/profile');
    } catch (error) {
        console.error(`Error in removeAddress: ${error.message}`);
        req.flash('error', 'Failed to delete address. Please try again later.');
        res.redirect('/profile');
    }
};

//------------------------ update exiting address ---------------------------

const updateAddress = async (req,res) =>{
    const id = req.session.user;
    const index = parseInt(req.params.index, 10);

    const data = {
        building : req.body.building,
        street : req.body.street,
        city : req.body.city,
        state : req.body.state,
        country : req.body.country,
        pincode :req.body.pincode,
        phoneNumber : req.body.phoneNumber,
        landmark : req.body.landmark
    }
    
    try {
        const updateQuery = {};
        updateQuery[`address.${index}`] = data;

        const result = await userSchema.updateOne(
            {_id: new ObjectId(id)},
            {$set : updateQuery}
        );
        req.flash('success','Address updated Successfully');
        res.redirect('/profile');

    }
    catch(error){
        console.log(`error in updating address in user profile ${error}`);
        req.flash('error','Cannot update address right now, PLease try again later');
        res.redirect(`/edit-address/${index}`);
    }
}



// ---------------------------- Reset Password Controller---------------------------------

const resetPassword = async (req, res) => {
   try {
       const userId = req.session.user;
       const { currentPassword, newPassword, confirmPassword } = req.body;

        // Find user
       const user = await userSchema.findById(userId);
       if (!user) {
           req.flash('error', 'User not found');
           return res.redirect('/profile');
       }
        // Verify current password
       const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
       if (!isPasswordValid) {
           req.flash('error', 'Current password is incorrect');
           return res.redirect('/profile');
       }
        // Check if new password is same as current password
       const isSamePassword = await bcrypt.compare(newPassword, user.password);
       if (isSamePassword) {
           req.flash('error', 'New password cannot be the same as current password');
           return res.redirect('/profile');
       }
        // Hash new password
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash(newPassword, salt);
        // Update password in database
       await userSchema.findByIdAndUpdate(userId, {
           password: hashedPassword
       });
        // Success message
       req.flash('success', 'Password updated successfully');
       res.redirect('/profile');
    } catch (error) {
       console.error('Error in resetPassword:', error);
       req.flash('error', 'Something went wrong while resetting password');
       res.redirect('/profile');
   }
}


module.exports = {
    profile,
    updateProfile,
    addAddress,
    removeAddress,
    updateAddress,
    resetPassword
}

