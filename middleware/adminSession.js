//--------------check admin is there-------------

function isAdmin(req,res,next){
  if(req.session && req.session.isAuthenticated){
      next();
  }
  else {
      res.redirect('/admin/login');
  }
}


const isLogin = (req,res,next)=>{
  if(req.session && req.session.isAuthenticated){
      res.redirect('/admin/home')
  }else{
      next()
  }
}

module.exports = {
  isAdmin,
  isLogin
}
