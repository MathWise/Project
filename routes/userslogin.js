const express = require('express');
const router = express.Router();
const passport = require('passport');

// POST route for handling login
router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',             // Redirect back to login if login fails
    failureFlash: true                     // Allow flash messages on failure
}), (req, res) => {
    // Successful login
    if (req.user.role === 'admin') {
        return res.redirect('/admin/homeAdmin');   // Redirect to admin dashboard
    } else if (req.user.role === 'student') {
        return res.redirect('/user/homeUser');     // Redirect to student dashboard
    } else {
        // If user has some other role or there's no defined role, log out for security reasons
        req.flash('error', 'Unauthorized role.');
        return res.redirect('/login');
    }
});

module.exports = router;
