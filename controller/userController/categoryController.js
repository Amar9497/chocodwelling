const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const brandSchema = require('../../model/brandSchema');


const categoryget = async(req,res)=>{
    try {
        const category = await categorySchema.find({isActive: true});
        const brand = await brandSchema.find({});
        //console.log(brand);
        
        res.render('user/category',{
            title:'Category',
            user:req.session.user,
            category,
            brand
        });
    }
    catch(error){
        console.log(`error in rendering category page ${error}`);
    }
}




module.exports={
    categoryget
}