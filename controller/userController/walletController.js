const walletSchema = require('../../model/walletSchema');

//--------------------------wallet page rendering----------------------

const walletPage = async (req,res)=>{
    try{
        const userId = req.session.user;
        let wallet = await walletSchema.findOne({ userID: userId });
        if (!userId) {
            req.flash('error', 'User Not found . Please login again.')
            return res.redirect('/login')
        }
        if (!wallet) {
            wallet = { balance: 0, transaction: [] };
        }
        res.render('user/wallet',{title:'Wallet' , wallet , user:userId })
    }catch(error){
        console.log(`error while render user wallet ${error}`)
        res.redirect('/profile')
        res.flash('success','error while render user wallet');
    }
}

module.exports = { walletPage };