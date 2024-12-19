const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');




router.post('/login', async (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.error('Error during authentication:', err);
            req.flash('error', 'An error occurred during login. Please try again.');
            return res.redirect('/login');
        }

        if (!user) {
            req.flash('error', info.message || 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Check if the email is verified
        if (!user.emailVerified) {
            req.flash('error', 'Please verify your email before logging in.');
            return res.redirect('/login');
        }

        // If email is verified, proceed with login
        req.logIn(user, (err) => {
            if (err) {
                console.error('Error logging in user:', err);
                req.flash('error', 'An error occurred. Please try again.');
                return res.redirect('/login');
            }

            // Redirect based on role
            if (user.role === 'admin') {
                res.send(`
                    <script>
                        sessionStorage.setItem("loggedIn", "true");
                        window.location.href = "/admin/homeAdmin";
                    </script>
                `);
            } else if (user.role === 'student') {
                res.send(`
                    <script>
                        sessionStorage.setItem("loggedIn", "true");
                        window.location.href = "/user/homeUser";
                    </script>
                `);
            } else {
                req.flash('error', 'Unauthorized role.');
                req.logout(() => res.redirect('/login'));
            }
        });
    })(req, res, next);
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
