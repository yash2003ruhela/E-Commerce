const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');


// show form for sign-up
router.get('/register' , (req,res)=>{
    res.render('auth/signup');
})


// actually registering a user
router.post('/register' , async(req,res)=>{
    try{
        let {email,username,password,role} = req.body;
        const user = new User({email,username,role});
        const newUser = await User.register(user,password);
        
        req.login(newUser, function(err) {
            if (err) { return next(err); }
            req.flash('success' , 'welcome, you are registered successfully')
            return res.redirect('/products');
        });
    }
    catch(e){
        req.flash('error' , e.message);
        return res.redirect('/products');
    }
})


// show form for login
router.get('/login' , (req,res)=>{
    res.render('auth/login');
})
        
//actually login a user
router.post('/login',
    passport.authenticate('local', { 
       failureRedirect: '/login', 
       failureMessage: true ,
    }),
    function(req, res) {
        req.flash('success' , `welcome back ${req.user.username}`);
        res.redirect(`/products`);
    }
);


//logout a user
router.get('/logout',(req,res)=>{
    req.logout(()=>{
        req.flash('success' , 'goodbye friend');
        res.redirect('/login');
    });
});

module.exports = router;