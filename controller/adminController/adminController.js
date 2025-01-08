const Order = require('../../model/orderSchema');
const userSchema = require('../../model/userSchema');


// admin login
const loadLogin = (req, res) => {
  try {
    if(req.session.admin){
      res.redirect('/admin/home');
  }
  else{
      res.render('admin/login',{
          title:'Admin Login'
      });
  }
  } catch (error) {
    console.log(error);
    res.flash("error","Error Occured")
  }
};

// --------------------- sdmin login post request -------------------------------

const loadLoginPost = (req, res) => {
  try {
    // Check if the credentials match
    if (
      req.body.email === process.env.ADMIN_EMAIL &&
      req.body.password === process.env.ADMIN_PASSWORD
    ) {
      req.session.admin = req.body.email;
      // req.session.save(()=>{
      //     res.redirect('admin/home')
      // })
      req.flash("success", "Login Successful");
      res.redirect("/admin/home"); // Redirect to home page
    } else {
      req.flash("error", "Invalid Credentials");
      res.redirect("/admin/login"); // Redirect back to login page if credentials are invalid
    }
  } catch (error) {
    console.log(`Error in login post: ${error}`);
    req.flash("error","Internal Server Error")
  }
};

// admin dashboard

const loadHome = async(req, res) => {
  try {
    const orders = await Order.find({
            orderStatus: { $nin: ["Cancelled", "Returned"] },
          }).populate("userId", "name");
    
          const user = await userSchema.countDocuments({});

          // Calculate total products sold
          const productResult = await Order.aggregate([
            {
              $match: {
                orderStatus: { $nin: ["Cancelled", "Returned"] },
              },
            },
            {
              $unwind: "$products",
            },
            {
              $group: {
                _id: null,
                totalQuantity: {
                  $sum: "$products.quantity",
                },
              },
            },
          ]);
    
          // Get the total quantity
          const productCount =
            productResult.length > 0 ? productResult[0].totalQuantity : 0;
    
          const summary = {
            totalOrders: orders.length,
            finalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
            productCount,
          };
          
          
    res.render("admin/dashboard", {
      title: "Admin Home",
      summary,
      user
    });
  } catch (error) {
    console.log(error);
    res.flash("error","Error Occured")
  }
};

// ------------------------------ admin logout --------------------------

const logout = (req, res) => {
  try {
    req.session.admin = null;
    res.redirect("/admin/logout");
  } catch (error) {
    console.log(error);
    res.flash("error","Error Occured")
  }
};

module.exports = {
  loadHome,
  loadLogin,
  loadLoginPost,
  logout,
};
