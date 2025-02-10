if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require('express');
const app = express();                  //ye application ka instance toh isko kabhi export nhi krenge or ye ek hi rhega
const path = require('path');
const mongoose = require('mongoose');
const seedDb = require('./seed');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const User = require('./models/User');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');


const dbURL = process.env.dbURL
mongoose.set('strictQuery', true);
mongoose.connect(dbURL)
.then(()=>{
    console.log("DB connected sucessfully");
})
.catch((err)=>{
    console.log("Db not connected");
    console.log(err);
})


app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));


let secret = process.env.SECRET || 'weneedabettersecretkey';

let store = MongoStore.create({
    secret:secret,
    mongoUrl: dbURL,
    touchAfter:24*60*60
})

// express-session ke liye middleware
const sessionConfig = {
    store:store,
    name:'bhaukaal',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie:{
        httpOnly:true,
        expires:Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(flash());



//passport wali cheje
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//PASSPORT
passport.use(new LocalStrategy(User.authenticate()));


//flash message ke liye locals name ka object use krte h brna fir sbke liye alag alag likhna hoga
app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})


//seeding database (initial wala) 
//ye keval ek baar run krni h beacuse har baar chlne pr baar baar seed ho jayenge 
// seedDb()

// routes require
const productRoutes = require('./routes/product');
const reviewRoutes = require('./routes/review');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const productApi = require('./routes/api/productapi');
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/orders');
const productOwner = require('./routes/productOwner');
const notifyMe = require('./routes/notify');

//home page
app.get('/' , (req,res)=>{
    res.render('home');
})

//middleware routes ke taki har ek incoming request pr chl sake
app.use(productRoutes);  
app.use(reviewRoutes);    
app.use(authRoutes);      
app.use(cartRoutes);      
app.use(productApi);      
app.use(paymentRoutes);   
app.use(orderRoutes); 
app.use(productOwner);
app.use(notifyMe);
 

const PORT = process.env.PORT;
app.listen(PORT,()=>{
    console.log(`server connected at port ${PORT}`);
})