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
    const successMessage = req.flash('success') || []; // Retrieve success messages
    const error = req.flash('error') || []; // Retrieve error messages
    res.render('login', { successMessage, error }); // Pass messages to the login page
});

// POST route for handling signup form submission
router.post('/signup', async (req, res) => {
    const { first_name, last_name, grade, section, email, age, password } = req.body;

    try {
        // Check if a user with the same email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already exists. Please choose a different email.');
            return res.render('signup', { 
                errorMessage: req.flash('error'), 
                userData: { first_name, last_name, grade, section, email, age } // Retain user input
            });
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
        
        req.flash('success', 'Account created successfully! Please check your email to verify your account.');
        res.redirect('/login'); // Redirect to the login page after success
    } catch (error) {
        console.error(`Error creating user: ${error.message}`);
        req.flash('error', 'Error creating account. Please try again.');
        return res.render('signup', { 
            errorMessage: req.flash('error'), 
            userData: { first_name, last_name, grade, section, email, age } // Retain user input on error
        });
    }
});

// Email verification route
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            req.flash('error', 'Invalid or expired verification token.');
            return res.redirect('/signup');
        }

        user.emailVerified = true; // Mark email as verified
        user.verificationToken = undefined; // Clear the token
        await user.save();

        req.flash('success', 'Email verified successfully! You can now log in.');
        res.redirect('/login');
    } catch (error) {
        console.error('Error verifying email:', error);
        req.flash('error', 'An error occurred during verification. Please try again.');
        res.redirect('/signup');
    }
});

module.exports = router;
