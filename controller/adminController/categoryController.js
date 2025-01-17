const categorySchema = require('../../model/categorySchema');
const mongoose = require('mongoose');

// category page render
const loadCategory= async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1; 
        const itemsPerPage = 10; 
        const search = req.query.search || '';

        // Sanitize search input to allow only letters and spaces
        const sanitizedSearch = search.replace(/[^a-zA-Z\s]/g, '');

        // Create search filter
        const filter = sanitizedSearch
            ? { categoryName: { $regex: sanitizedSearch, $options: 'i' } } 
            : {};

        // Get total count with filter
        const totalCategories = await categorySchema.countDocuments(filter); 
        const totalPages = Math.ceil(totalCategories / itemsPerPage);

        // Ensure current page is within valid range
        const validatedPage = Math.max(1, Math.min(page, totalPages || 1));
        const skip = (validatedPage - 1) * itemsPerPage;

        // Fetch categories with pagination
        const categories = await categorySchema.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage);

        res.render('admin/category', { 
            title: 'category',
            categories, 
            currentPage: validatedPage, 
            totalPages,
            search: sanitizedSearch
        });
        
    } catch (error) {
        console.error('Error in category page:', error);
        res.status(500).send('Server Error');
    }
}


// adding new category
const addCategoryPost= async (req,res)=>{
    try {
        const name = req.body.categoryName;
        const category = {categoryName: name, isActive: true};
        const check = await categorySchema.findOne({categoryName: {$regex: name,$options: 'i'}});

        if(!check){
            await categorySchema.insertMany(category)
                .then(()=>{
                    req.flash('success','New category added');
                    res.redirect('/admin/category');
                })
                .catch((error)=>{
                    console.log(`error in adding category ${error}`);
                })
        } else {
            req.flash('error','Category already exists');
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.log(`error in add  category page ${error}`);
    }
}


// edit category
const editCategory = async (req, res) => {
    try {
        const categoryId =req.body.categoryId;
        const  categoryName = req.body.categoryName;
       
        const editCategory = await categorySchema.findByIdAndUpdate(categoryId, {categoryName:categoryName},{new:true});
          
        console.log(editCategory)
        if(editCategory != null){
            console.log("success");
            req.flash('success','Category Successfully edited');
            res.redirect('/admin/category');
        } else {
            console.log("error")
            req.flash('error','Category unable to edit');
            res.redirect('/admin/category');
        }
    }
    catch(error){
        console.log(`error in editing category ${error}`);
    }
};


// status category
const status= async(req,res)=>{
    //console.log(req.params.id);
    const { id } = req.params; 
    try {
        const category = await categorySchema.findById(id);
        if (!category) {
            return res.status(404).send('Category not found');
        }
        category.isActive = !category.isActive; 
        await category.save();
        res.redirect('/admin/category'); 
    }
    catch(error){
        console.error('Error toggling category status:', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports={
    loadCategory,
    addCategoryPost,
    editCategory,
    status
}