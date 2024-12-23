const userSchema = require('../../model/userSchema');


// ----------- customer page render -------------

const loadCustomers = async (req,res)=>{
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const user = await userSchema.find({name: {$regex: search, $options: 'i'}})
            .sort({createdAt: -1})
            .limit(limit)
            .skip((page - 1) * limit);
        
        const count = await userSchema.countDocuments({name: {$regex: search, $options: 'i'}});

        res.render('admin/customers',{
            title:'Customers',
            user,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search,
            limit,
            page
        })
    } catch (error) {
        console.log(`error while loading users list in admin side ${error}`);   
    }
}

// ------------------------------ customer block/unblock -------------------------------------

const status = async (req, res) => {
    try {
        const { id, status } = req.query;
        const newStatus = !(status === 'true');

        // Update the user's active status in the database
        await userSchema.findByIdAndUpdate(id, { isActive: newStatus });

        // Check if the blocked user is the currently logged-in user
        if (req.session.user && req.session.user.toString() === id && !newStatus) {
            // End the session for the blocked user
            req.session.destroy((err) => {
                if (err) {
                    console.log(`Error while destroying session: ${err}`);
                    req.flash('error', 'An error occurred while logging out.');
                }
                res.redirect('/login'); // Redirect to the login page after logout
            });
        } else {
            // Redirect to the admin customers page if no logout is required
            res.redirect('/admin/customers');
        }
    } catch (error) {
        console.log(`Error in changing status of user: ${error}`);
        req.flash('error', 'An error occurred while changing user status.');
        res.redirect('/admin/customers');
    }
};


module.exports={
    loadCustomers,
    status
}
