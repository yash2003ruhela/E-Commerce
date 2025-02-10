const express = require('express');
const router = express.Router();
const {v4:uuid} = require('uuid')
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const {isLoggedIn} = require('../middleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// checkout
router.post('/user/checkout', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id).populate('cart');

     // Check stock availability
     for (const item of user.cart) {
        const product = await Product.findById(item._id);
        if (!product || product.quantity < 1) {
            req.flash('error', `Sorry, ${item.name} is out of stock!`);
            return res.redirect('/user/cart');
        }
    }
    
    // Calculate total amount
    const totalAmount = user.cart.reduce((sum, curr) => sum + curr.price, 0);

    try {
        // Create a payment session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: user.cart.map((product) => ({
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: product.name,
                        description: product.desc,
                        images: [product.img],
                    },
                    unit_amount: Math.round(product.price * 100), // Amount in cents
                },
                quantity: 1,
            })),
            mode: 'payment',
            success_url: 'http://localhost:8080/user/cart/success', // Redirect after success
            cancel_url: 'http://localhost:8080/user/cart/cancel',  // Redirect after cancel
        });

        // Redirect to Stripe checkout
        res.redirect(session.url);
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.redirect('/user/cart'); // Redirect back to the cart in case of error
    }
});


// Success route
router.get('/user/cart/success', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id).populate('cart');
    const cartItems = user.cart;
    if (!cartItems || cartItems.length === 0) {
        req.flash('error', 'Your cart is empty!');
        return res.redirect('/user/cart');
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
    try {
        // Find an existing order for the user
        let order = await Order.findOne({ user: req.user._id });

        if (order) {
            // Add new products to the existing order
            for (const item of cartItems) {
                const product = await Product.findById(item._id); // Await here
                const existingProduct = order.products.find(
                    (prod) => prod.product.toString() === item._id.toString()
                );

                if (existingProduct) {
                    existingProduct.quantity += 1; // Increment quantity if the product already exists
                } else {
                    order.products.push({
                        product: item._id,
                        quantity: 1,
                        price: item.price,
                        orderDate: Date.now(),
                    });
                }

                // Reduce product quantity in stock
                product.quantity -= 1;
                await product.save(); // Ensure product stock updates correctly
            }
            order.totalAmount += totalAmount;
        } else {
            // Create a new order if none exists
            order = new Order({
                user: req.user._id,
                products: [],
                totalAmount,
            });

            for (const item of cartItems) {
                const product = await Product.findById(item._id);

                // Add product to the order
                order.products.push({
                    product: item._id,
                    quantity: 1,
                    price: item.price,
                    orderDate: Date.now(),
                });

                // Reduce product quantity in stock
                product.quantity -= 1;
                await product.save(); // Ensure product stock updates correctly
            }
        }

        await order.save();

        // Clear the user's cart after successful payment
        user.cart = [];
        await user.save();

        res.render('cart/success', { message: 'Payment successful! Thank you for your purchase.'});
    } catch (error) {
        console.error('Error creating/updating order:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/user/cart');
    }
});

// Cancel route
router.get('/user/cart/cancel', isLoggedIn, (req, res) => {
    res.render('cart/cancel', { message: 'Payment canceled. You can try again.' });
});


// for single buy
router.post('/products/:productId/buy', isLoggedIn ,async (req, res) => {
    try {
        const {productId} = req.params;
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found!');
            return res.redirect('/products');
        }
        if(product.quantity<1){
            req.flash('error',`Sorrt ${product.name} is out of Stock !`);
            return res.redirect(`/products/${productId}`);
        }

        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: product.name,
                            description: product.desc,
                            images: [product.img],
                        },
                        unit_amount: Math.round(product.price * 100), // Convert price to cents
                    },
                    quantity: 1, // For single product purchase
                },
            ],
            mode: 'payment',
            success_url: `http://localhost:8080/products/${productId}/success`, // Redirect after success
            cancel_url: `http://localhost:8080/products/${productId}/cancel`,  // Redirect after cancel
        });

        // Redirect to Stripe Checkout
        res.redirect(session.url);
    } catch (err) {
        console.error('Error creating Stripe session:', err);
        req.flash('error', 'Something went wrong. Try again.');
        res.redirect('/products');
    }
});

router.get('/products/:id/success', async (req, res) => {

    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
        req.flash('error', 'Product not found!');
        return res.redirect('/products');
    }

    try {
        // Find an existing order for the user
        let order = await Order.findOne({ user: req.user._id });

        if (order) {
            const existingProduct = order.products.find(
                (prod) => prod.product.toString() === product._id.toString()
            );
            if (existingProduct) {
                existingProduct.quantity += 1;
            } else {
                order.products.push({
                    product: product._id,
                    quantity: 1,
                    price: product.price,
                    orderDate: Date.now(),
                });
            }
            order.totalAmount += product.price;
        } else {
            // Create a new order
            order = new Order({
                user: req.user._id,
                products: [
                    {
                        product: product._id,
                        quantity: 1,
                        price: product.price,
                        orderDate: Date.now(),
                    },
                ],
                totalAmount: product.price,
            });
        }
        // decrease product quantity
        product.quantity -= 1;
        await product.save();

        await order.save();
        res.render('cart/success', { product, message: 'Payment successful!' });
    } catch (error) {
        console.error('Error processing order:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/products');
    }

});

router.get('/products/:id/cancel', async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        req.flash('error', 'Product not found!');
        return res.redirect('/products');
    }
    res.render('cart/cancel', { product, message: 'Payment was canceled!' });
});


module.exports = router;