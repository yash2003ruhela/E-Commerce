const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const { validateReview , isLoggedIn} = require('../middleware');


router.post('/products/:productid/review',validateReview, isLoggedIn , async(req, res) => {
    try {
        const { productid } = req.params;
        const { rating, comment } = req.body;

        const product = await Product.findById(productid);

        const review = new Review({ rating, comment ,user:req.user._id });

        // Average Rating Logic
        const newAverageRating = ((product.avgRating * product.reviews.length) + parseInt(rating)) / (product.reviews.length + 1);
        product.avgRating = parseFloat(newAverageRating.toFixed(1));

        product.reviews.push(review);

        await review.save();
        await product.save();

        req.flash('success', 'Added your review successfully!');
        res.redirect(`/products/${productid}`);
    }

    catch (e) {
        res.status(500).render('error', { err: e.message });
    }
    
});

// deleting review
router.delete('/products/:productid/review/:reviewid', isLoggedIn, async (req, res) => {
    try {
        const { productid, reviewid } = req.params;

        const review = await Review.findById(reviewid);

        // Check if the logged-in user is the owner of the review
        if (!review.user.equals(req.user._id)) {
            req.flash('error', 'You are not authorized to delete this review.');
            return res.redirect(`/products/${productid}`);
        }

        await Review.findByIdAndDelete(reviewid);

        // Remove the review from the product's reviews array
        await Product.findByIdAndUpdate(productid, { $pull: { reviews: reviewid } });

        req.flash('success', 'Review deleted successfully!');
        res.redirect(`/products/${productid}`);
    } catch (e) {
        res.status(500).render('error', { err: e.message });
    }
});


module.exports = router;