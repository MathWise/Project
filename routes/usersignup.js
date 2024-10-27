const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user.js'); // Assuming you have a User model set up
const { check, validationResult } = require('express-validator'); // Optional: for validation

// GET route for rendering signup form
router.get('/signup', (req, res) => {
    const errorMessage = req.flash('error'); // Get error message from flash
    res.render('signup', { errorMessage, userData: {} }); // Pass the message and an empty object to the template
});

// GET route for rendering login form
router.get('/login', (req, res) => {
    const successMessage = req.flash('success') || []; // Ensure it's always an array
    res.render('login', { successMessage });
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

        // Create a new user
        const newUser = new User({ 
            first_name, 
            last_name, 
            grade, 
            section, 
            email, 
            age, 
            password: hashedPassword 
        });

        await newUser.save(); // Save the user to the database
        
        req.flash('success', 'Account created successfully!');
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

module.exports = router;
