const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const sendEmail = require('../routes/emailService');



// Rate limiter for login route
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    max: 5,  // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

router.post('/login',loginLimiter, async (req, res, next) => {

    const { email, password } = req.body;

    // Server-side validation for email and password length
    if (!email || email.length > 255) {
        return res.redirect('/login?error=Email is too long. Maximum length is 255 characters.');
    }

    if (!password || password.length < 5 || password.length > 64) {
        return res.redirect('/login?error=Password must be between 8 and 64 characters.');
    }

       // Validate password for special characters (at least one special character required)
       const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
       if (!specialCharRegex.test(password)) {
           return res.redirect('/login?error=Password must contain at least one special character.');
       }
       
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.error('Error during authentication:', err);
            return res.redirect('/login?error=An error occurred during login. Please try again.');
        }

        if (!user) {
            const errorMessage = info.message || 'Invalid email or password.';
            return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }

      // Check if the email is verified
      if (!user.emailVerified) {
        try {
            // Generate a new token
            const newVerificationToken = crypto.randomBytes(32).toString('hex');
            user.verificationToken = newVerificationToken;
            await user.save();

            // Resend the verification email
            const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email/${newVerificationToken}`;
            const emailContent = `
                <h1>Email Verification</h1>
                <p>Hello ${user.first_name},</p>
                <p>Please verify your email by clicking the link below:</p>
                <a href="${verificationUrl}">Verify Email</a>
            `;
            await sendEmail(user.email, 'Verify Your Email', emailContent);

            const message = 'Please verify your email before logging in. A new verification email has been sent.';
            return res.redirect(`/login?error=${encodeURIComponent(message)}&email=${encodeURIComponent(user.email)}`);
        } catch (error) {
            console.error('Error resending verification email:', error);
            const errorMessage = 'An error occurred while sending a new verification email. Please try again.';
            return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }
    }

        // If email is verified, proceed with login
        req.logIn(user, (err) => {
            if (err) {
                console.error('Error logging in user:', err);
                return res.redirect('/login?error=An error occurred. Please try again.');
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
                return res.redirect('/login?error=Unauthorized role.');
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
