const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');




router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',             // Redirect back to login if login fails
    failureFlash: true                     // Allow flash messages on failure
}), (req, res) => {
    // Successful login
    if (req.user.role === 'admin') {
        res.send(`
            <script>
                sessionStorage.setItem("loggedIn", "true");
                window.location.href = "/admin/homeAdmin";
            </script>
        `);
    } else if (req.user.role === 'student') {
        res.send(`
            <script>
                sessionStorage.setItem("loggedIn", "true");
                window.location.href = "/user/homeUser";
            </script>
        `);
    } else {
        // If user has an undefined role, log out for security reasons
        req.flash('error', 'Unauthorized role.');
        req.logout();
        res.redirect('/login');
    }
});

//------------------------------------------------------------------------------------------------------------------

// // Rate limiter for login route
// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,  // 15-minute window
//     max: 5,  // Limit each IP to 5 login attempts per windowMs
//     message: 'Too many login attempts from this IP, please try again after 15 minutes'
// });

// // POST route for handling login with rate limiter
// router.post('/login', loginLimiter, passport.authenticate('local', {
//     failureRedirect: '/login',             // Redirect back to login if login fails
//     failureFlash: true                     // Allow flash messages on failure
// }), (req, res) => {
//     // Successful login
//     if (req.user.role === 'admin') {
//         res.send(`
//             <script>
//                 sessionStorage.setItem("loggedIn", "true");
//                 window.location.href = "/admin/homeAdmin";
//             </script>
//         `);
//     } else if (req.user.role === 'student') {
//         res.send(`
//             <script>
//                 sessionStorage.setItem("loggedIn", "true");
//                 window.location.href = "/user/homeUser";
//             </script>
//         `);
//     } else {
//         // If user has an undefined role, log out for security reasons
//         req.flash('error', 'Unauthorized role.');
//         req.logout();
//         res.redirect('/login');
//     }
// });

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                req.flash('error', 'Logout failed. Try again.');
                return res.redirect('/login');
            }
            res.clearCookie('connect.sid');  // Clears the session cookie
            res.redirect('/login');  // Redirects to login page
        });
    });
});

module.exports = router;
