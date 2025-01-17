const mongoose = require('mongoose');
require('dotenv').config();


const connectDB=async()=>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true, // Optional but recommended
          useUnifiedTopology: true, // Optional but recommended
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
      }
}
module.exports=connectDB;