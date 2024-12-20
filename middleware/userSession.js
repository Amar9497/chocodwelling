const isCheck = (req,res,next)=>{
    if(req.session&&req.session.user){
        next()
    }else{
        res.redirect('/login');
    }
}

const isLogin = (req,res,next)=>{
    if(req.session&&req.session.user){
        res.redirect('/home');
    }else{
        next()
    }
}

module.exports = {
    isCheck,
    isLogin
}