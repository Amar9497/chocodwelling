// admin login
const loadLogin=(req,res)=>{
    try {
        res.render('admin/login',{title: 'Admin Login'})
    } catch (error) {
        console.log(error);
        res.status(500).send('Error Occured');
    }
}

// --------------------- sdmin login post request -------------------------------

const loadLoginPost = (req, res) => {
    try {
      // Check if the credentials match
      if (req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;  // Store admin's email in the session
        // req.session.save(()=>{
        //     res.redirect('admin/home')
        // })
        req.flash('success', 'Login Successful');
        res.redirect('/admin/home');  // Redirect to home page
      } else {
        req.flash('error', 'Invalid Credentials');
        res.redirect('/admin/login');  // Redirect back to login page if credentials are invalid
      }
    } catch (error) {
      console.log(`Error in login post: ${error}`);
      res.status(500).send('Internal Server Error');
    }
  };



// admin dashboard 

const loadHome=(req,res)=>{
    try {
        res.render('admin/dashboard',{title: 'Admin Home'})
    } catch (error) {
        console.log(error);
        res.status(500).send('Error Occured');
    }
}

// ------------------------------ admin logout --------------------------

const logout = (req,res) =>{
    try {
        req.session.destroy();
        res.redirect('/admin/logout') 
    } catch (error) {
        console.log(error)
        res.status(500).send("Error occured")
    }  
}




module.exports={
    loadHome,
    loadLogin,
    loadLoginPost,
    logout
}
    