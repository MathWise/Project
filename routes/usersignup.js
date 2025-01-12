const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Import the crypto module
const User = require('../models/user.js'); // Assuming you have a User model set up
const { check, validationResult } = require('express-validator'); // Optional: for validation
const sendEmail = require('../routes/emailService'); // Import your email sending service

// GET route for rendering signup form
router.get('/signup', (req, res) => {
    const errorMessage = req.flash('error'); // Get error message from flash
    res.render('signup', { errorMessage, userData: {} }); // Pass the message and an empty object to the template
});

// GET route for rendering login form
router.get('/login', (req, res) => {
    const successMessage = req.flash('success') || [];
    const errorMessage = req.flash('error') || [];

     // Extract email from query params or use an empty string if not provided
     const email = req.query.email || '';

    res.render('login', {
        messages: {
            success: successMessage,
            error: errorMessage,
        },
        email,
    });
});
// POST route for handling signup form submission
router.post('/signup', async (req, res) => {
    const { first_name, last_name, grade, section, email, age, password } = req.body;

    try {
        // Check if a user with the same email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const errorMessage = 'Email already exists. Please choose a different email.';
            return res.redirect(`/signup?error=${encodeURIComponent(errorMessage)}&userData=${encodeURIComponent(
                JSON.stringify({ first_name, last_name, grade, section, email, age })
            )}`);
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex'); // Generate a verification token

        // Create a new user
        const newUser = new User({ 
            first_name, 
            last_name, 
            grade, 
            section, 
            email, 
            age, 
            password: hashedPassword,
            verificationToken, 
        });

        await newUser.save(); // Save the user to the database

        // Send verification email
        const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;
        const emailContent = `
            <h1>Email Verification</h1>
            <p>Hello ${first_name},</p>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationUrl}">Verify Email</a>
        `;
        await sendEmail(email, 'Verify Your Email', emailContent);
        const successMessage = 'Account created successfully! Please check your email to verify your account.';
        res.redirect(`/login?success=${encodeURIComponent(successMessage)}`);
    } catch (error) {
        console.error(`Error creating user: ${error.message}`);
        const errorMessage = 'Error creating account. Please try again.';
        return res.redirect(`/signup?error=${encodeURIComponent(errorMessage)}&userData=${encodeURIComponent(
            JSON.stringify({ first_name, last_name, grade, section, email, age })
        )}`);
    }
});

// Email verification route
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            const errorMessage = 'Invalid or expired verification token.';
            return res.redirect(`/signup?error=${encodeURIComponent(errorMessage)}`);
        }

        // Check if the token has expired
        const tokenAge = Date.now() - new Date(user.tokenCreatedAt).getTime(); // Difference in milliseconds
        if (tokenAge > 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
            user.verificationToken = undefined; // Clear the expired token
            user.tokenCreatedAt = undefined; // Clear the token creation time
            await user.save();
            return res.redirect('/signup?error=Verification token expired. Please request a new one.');
        }

  

        user.emailVerified = true; // Mark email as verified
        user.verificationToken = undefined; // Clear the token
        user.tokenCreatedAt = undefined; // Clear the token creation time
        await user.save();

        const successMessage = 'Email verified successfully! You can now log in.';
        res.redirect(`/login?success=${encodeURIComponent(successMessage)}`);
    } catch (error) {
        console.error('Error verifying email:', error);
        const errorMessage = 'An error occurred during verification. Please try again.';
        res.redirect(`/signup?error=${encodeURIComponent(errorMessage)}`);
    }
});


// POST route to resend verification email
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found.');
        }

        if (user.emailVerified) {
            return res.status(400).send('Email is already verified.');
        }

        // Generate a new token and save it
        const newVerificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = newVerificationToken;
        user.tokenCreatedAt = Date.now(); 
        await user.save();

        // Send a new verification email
        const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email/${newVerificationToken}`;
        const emailContent = `
            <h1>Email Verification</h1>
            <p>Hello ${user.first_name},</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="${verificationUrl}">Verify Email</a>
        `;
        await sendEmail(user.email, 'Verify Your Email', emailContent);

        res.status(200).send('A new verification email has been sent.');
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).send('An error occurred while resending the verification email.');
    }
});
module.exports = router;
