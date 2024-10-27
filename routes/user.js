//   /routes/admin.js
const multer = require('multer');
const { MongoClient, GridFSBucket } = require('mongodb');
const express = require('express');
const Lesson = require('../models/lesson.js'); 
const mongoose = require('mongoose');
const router = express.Router();
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const middleware = require('../middleware'); // Ensure this import is correct
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;
const User = require('../models/user'); // Use your existing User model
const connectDB = require('../config/dbConnection');
const mongoURI = process.env.MONGODB_URI;

// Render the homeAdmin page with room creation and existing rooms
router.get('/homeUser', ensureLoggedIn, async (req, res) => {
    try {
        const rooms = await Room.find(); // Fetch rooms from MongoDB
        res.render('user/homeUser', {
            rooms,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error')
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error fetching rooms.');
        res.redirect('/error'); // Redirect to error page if something goes wrong
    }
});


// Get dashboard for a specific room
router.get('/dashboard/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Check if roomId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            req.flash('error', 'Invalid room ID.');
            return res.redirect('/user/homeUser');
        }

        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/user/homeUser');
        }
        // Pass the room to the dashboard template
        res.render('admin/dashboard', { room });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/user/homeUser');
    }
});

module.exports = router;
