const categorySchema = require('../../model/categorySchema');
const mongoose = require('mongoose');

// category page render
const loadCategory= async(req,res)=>{
    const page = parseInt(req.query.page) || 1; 
    const itemsPerPage = 10; 
    const skip = (page - 1) * itemsPerPage;

    try {
        const totalCategories = await categorySchema.countDocuments(); 
        const categories = await categorySchema.find({})
            .skip(skip) 
            .limit(itemsPerPage); 

        const totalPages = Math.ceil(totalCategories / itemsPerPage); 
        
        res.render('admin/category', { 
            title:'category',
            categories, 
            currentPage: page, 
            totalPages 
        });
        
    } catch (error) {
        console.error(err);
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
    const { id } = req.params; // Get category ID
    try {
        const category = await categorySchema.findById(id);
        if (!category) {
            return res.status(404).send('Category not found');
        }
        category.isActive = !category.isActive; // Toggle the isActive field
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