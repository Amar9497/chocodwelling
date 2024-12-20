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

const status = async (req,res)=>{
    try {
        const {id,status} = req.query;
        const newStatus = !(status === 'true')

        await userSchema.findByIdAndUpdate(id,{isActive:newStatus});
        res.redirect('/admin/customers');
    }
    catch(error){
        console.log(`error in changing status of user ${error}`);
    }
}

module.exports={
    loadCustomers,
    status
}
