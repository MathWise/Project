const express = require('express');
const router = express.Router();
const middleware = require('../middleware');

// Route for user home
router.get('/homeUser', middleware.ensureStudentLoggedIn, (req, res) => {
    console.log("User home route accessed");
    res.render('user/homeUser', { user: req.user }); // Adjust the path if necessary
});

// View courses route
router.get('/courses', middleware.ensureStudentLoggedIn, (req, res) => {
    // Code to fetch courses from the database
    res.render('courses', { user: req.user }); // Render courses page
});

// View grades route
router.get('/grades', middleware.ensureStudentLoggedIn, (req, res) => {
    // Code to fetch grades from the database
    res.render('grades', { user: req.user }); // Render grades page
});

module.exports = router;
