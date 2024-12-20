const mongoose = require('mongoose');


const connectDB=async()=>{
    try {
        const conn=await mongoose.connect("mongodb://localhost:27017/chocodwelling",{});
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.log(error);
    }
}
module.exports=connectDB;