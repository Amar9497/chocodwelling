const userSchema = require('../../model/userSchema');


// ----------- customer page render -------------

const loadCustomers = async (req,res)=>{
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        // Sanitize search input to allow only letters
        const sanitizedSearch = search.replace(/[^a-zA-Z\s]/g, '');

        const user = await userSchema.find({name: {$regex: sanitizedSearch, $options: 'i'}})
            .sort({createdAt: -1})
            .limit(limit)
            .skip((page - 1) * limit);
        
        const count = await userSchema.countDocuments({name: {$regex: sanitizedSearch, $options: 'i'}});

        res.render('admin/customers',{
            title:'Customers',
            user,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search: sanitizedSearch,
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

        // Update the user active status in the database
        await userSchema.findByIdAndUpdate(id, { isActive: newStatus });
        req.session.user = null;
        res.redirect('/admin/customers');
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
