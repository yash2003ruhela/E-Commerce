const Product = require("../models/Product");


const showAllProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.render('products/index', { products });
    }
    catch (e) {
        res.status(500).render('error',{err:e.message})
    }
}


const productForm = (req, res) => {
    try {
        res.render('products/new');
    }
    catch (e) {
         res.status(500).render('error',{err:e.message})
    }  
}

const createProduct = async (req, res) => {
    try {
        const { name, img, desc, price , quantity} = req.body;
        await Product.create({ name, img, price: parseFloat(price), desc,author:req.user._id ,quantity });
        req.flash('success', 'Successfully added a new product!');
        res.redirect('/products');
    }
    catch (e) {
        res.status(500).render('error', { err: e.message })
    }
}

const showProduct = async(req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).populate('reviews');
        res.render('products/show', { product}); 
    }
    catch (e) {
        res.status(500).render('error',{err:e.message})
    }
}

const editProductForm = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        res.render('products/edit', { product });
    }
    catch (e) {
        res.status(500).render('error',{err:e.message})
    }  
}

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, img, desc , quantity } = req.body;
        await Product.findByIdAndUpdate(id, { name, price, desc, img , quantity});
        req.flash('success', 'Edit Your Product Successfully');
        res.redirect(`/products/${id}`);
    }
    catch (e) {
        res.status(500).render('error',{err:e.message})
    } 
}


const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // delete the review whenever we delete the product
        //way 1 (normal way) 
        // let product = await Product.findById(id);
        // for(let id of product.reviews){
        //     await Review.findByIdAndDelete(id);
        // }
    
    
        //way 2 (behind the scene mongoose ka middleware use hora h toh ham ussi ko use krenge direct)
        // Product wale model me likhenge middleware
        
        await Product.findByIdAndDelete(id);
        req.flash('success',"Product deleted successfully");
        res.redirect('/products');
    }
    catch (e) {
        res.status(500).render('error',{err:e.message})   
    }
}


module.exports = {showAllProducts , productForm , createProduct , showProduct , editProductForm , updateProduct , deleteProduct }