const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const {isLoggedIn,isProductAuthor} = require('../middleware');


// restock form ko lene ke liye
router.get('/products/:id/restockform', async(req,res)=>{
    const {id} = req.params;
    const product = await Product.findById(id);
    res.render('products/restock',{product});
})


// Add user to notify list
router.post('/products/:id/notify', isLoggedIn, async (req, res) => {
    try {
        const {id} = req.params;
        const product = await Product.findById(id);
        const user = await User.findById(req.user._id);

        if (!product || !user) {
            req.flash('error', 'Product or user not found.');
            return res.redirect('/products');
        }

        // Add user to notify list if not already added
        if (!product.notifyList.includes(req.user._id)) {
            product.notifyList.push(req.user._id);
            await product.save();
        }

        req.flash('success', 'You will be notified when the product is back in stock.');
        res.redirect('/products');
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


// Notify users when product is restocked
router.patch('/products/:id/restock', isLoggedIn, isProductAuthor, async (req, res) => {
    try {
        const {id} = req.params;
        const {quantity} = req.body;
        const product = await Product.findById(id).populate('notifyList');

        if (!product) {
            req.flash('error', 'Product not found.');
            return res.redirect('/products');
        }

        product.quantity = quantity;
        await product.save();

        // Notify all users who signed up for notifications
        if (product.notifyList.length > 0) {
            for (let user of product.notifyList) {
                user.notifications.push(product._id);
                await user.save();

                // Send email notification
                await sendEmail(user.email, product);
            }
            product.notifyList = []; // Clear notify list after notifying
            await product.save();
        }

        req.flash('success', 'Product restocked and users notified.');
        res.redirect(`/products/${id}`);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

// Email sending function
async function sendEmail(to, product) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL, 
            pass: process.env.EMAIL_PASSWORD
        }
    });

    let mailOptions = {
        from: process.env.EMAIL,
        to,
        subject: 'Product Back in Stock!',
        text: `Good news! The product "${product.name}" is now back in stock. Grab it before it runs out again!`
    };

    await transporter.sendMail(mailOptions);
}

module.exports = router;