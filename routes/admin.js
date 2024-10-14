const multer = require('multer');
const { MongoClient, GridFSBucket } = require('mongodb');
const express = require('express');
const Lesson = require('../models/lesson.js'); 
const mongoose = require('mongoose');
const router = express.Router();
const Room = require('../models/room');
const middleware = require('../middleware'); // Ensure this import is correct
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;
const User = require('../models/user'); // Use your existing User model
const connectDB = require('../config/dbConnection');
const mongoURI = process.env.MONGODB_URI;


// Render the homeAdmin page with room creation and existing rooms
router.get('/homeAdmin', ensureLoggedIn, async (req, res) => {
    try {
        const rooms = await Room.find(); // Fetch rooms from MongoDB
        res.render('admin/homeAdmin', {
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

// Handle room creation form submission
router.post('/homeAdmin', ensureAdminLoggedIn, async (req, res) => {
    const { name, gradeLevel, teacherName, roomPassword } = req.body;

    try {
        // Validate input data if necessary
        const newRoom = new Room({ name, gradeLevel, teacherName, roomPassword });
        await newRoom.save();
        req.flash('success', 'Room created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error creating room. Please ensure all fields are filled in correctly.');
        res.redirect('/admin/homeAdmin');
    }
});

// Get dashboard for a specific room
router.get('/dashboard/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Check if roomId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            req.flash('error', 'Invalid room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }
        // Pass the room to the dashboard template
        res.render('admin/dashboard', { room });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});
//end of dashboard----------------------------------------------------------------------------------------------------------------------------

// Route to handle lessons for a specific room
router.get('/lesson/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const roomId = req.params.roomId;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const lesson = await Lesson.findOne({ roomId }); // Fetch lesson associated with the room
        res.render('admin/lesson', { room, lesson }); // Pass lesson data to the view
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});

// Route to manage user access
router.get('/manage-access', ensureAdminLoggedIn, async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin/manageAccess', {
            users,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error')
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error fetching users.');
        res.redirect('/admin/homeAdmin');
    }
});

// Grant access to a user (changing role to admin)
router.post('/give-access/:userId', ensureAdminLoggedIn, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (user) {
            if (user.role !== 'admin') {
                user.role = 'admin'; // Change role to admin
                await user.save();
                req.flash('success', 'Access granted successfully!');
            } else {
                req.flash('error', 'User is already an admin.');
            }
        } else {
            req.flash('error', 'User not found.');
        }
        res.redirect('/admin/manage-access');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error granting access.');
        res.redirect('/admin/manage-access');
    }
});

// Remove access from a user (changing role to student)
router.post('/remove-access/:userId', ensureAdminLoggedIn, async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (user) {
            if (user.role !== 'student') {
                user.role = 'student'; // Change role to student
                await user.save();
                req.flash('success', 'Access revoked successfully!');
            } else {
                req.flash('error', 'User is already a student.');
            }
        } else {
            req.flash('error', 'User not found.');
        }
        res.redirect('/admin/manage-access');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error revoking access.');
        res.redirect('/admin/manage-access');
    }
});
//end of managing room--------------------------------------------------------------------------------

let pdfBucket;
let videoBucket;

const initDB = async () => {
    try {
        const client = await MongoClient.connect(mongoURI);
        const db = client.db();
        
        // Initialize separate buckets for PDFs and videos
        pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' }); 
        videoBucket = new GridFSBucket(db, { bucketName: 'videos' });

        console.log('MongoDB connected and GridFSBuckets for PDFs and Videos initialized');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw new Error('Failed to connect to MongoDB');
    }
};

initDB();


// Set up multer storage in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to upload PDF to MongoDB GridFS
router.post('/upload-pdf/:roomId', upload.single('pdfFile'), async (req, res) => {
    const { roomId } = req.params;
    console.log('Uploaded File:', req.file);

    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    // Create an upload stream to the PDFs GridFS bucket
    const uploadStream = pdfBucket.openUploadStream(req.file.originalname);

    // Write the buffer to GridFS
    uploadStream.end(req.file.buffer);

    // Handle errors during the upload process
    uploadStream.on('error', (error) => {
        console.error('Error uploading file to GridFS:', error);
        req.flash('error', 'Error uploading PDF. Please try again.');
        return res.redirect(`/admin/lesson/${roomId}`);
    });

    // Handle the finish event
    uploadStream.on('finish', async () => {
        try {
            // Retrieve the file after upload by its filename
            const uploadedFile = await pdfBucket.find({ filename: req.file.originalname }).toArray();

            if (!uploadedFile || uploadedFile.length === 0) {
                console.error('File not found in GridFS after upload.');
                req.flash('error', 'Error saving file reference. Please try again.');
                return res.redirect(`/admin/lesson/${roomId}`);
            }

            const file = uploadedFile[0];
            console.log('File uploaded:', file);

            // Add the new file to the lesson's pdfFiles array
            await Lesson.findOneAndUpdate(
                { roomId },
                { 
                    $push: {
                        pdfFiles: {
                            pdfFileId: file._id,
                            pdfFileName: req.file.originalname
                        }
                    }
                },
                { new: true, upsert: true }
            );

            req.flash('success', 'PDF uploaded and saved to the lesson.');
            res.redirect(`/admin/lesson/${roomId}`);
        } catch (error) {
            console.error('Error updating lesson with file ID:', error);
            req.flash('error', 'Error saving file reference. Please try again.');
            res.redirect(`/admin/lesson/${roomId}`);
        }
    });
});


// Route to serve PDF by file ID from GridFS
// Route to serve PDF by file ID from GridFS
router.get('/pdf/:id', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = pdfBucket.openDownloadStream(fileId); // Use pdfBucket here

        // Set the response headers to show the PDF inline
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline');

        // Pipe the data to the response
        downloadStream.pipe(res);

        // Handle errors during the download stream
        downloadStream.on('error', () => {
            res.status(404).send('File not found.');
        });
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).send('Error retrieving file.');
    }
});

router.post('/upload-video/:roomId', upload.single('videoFile'), async (req, res) => {
    console.log('Video upload route hit');
    console.log('Room ID:', req.params.roomId);
    console.log('Uploaded File:', req.file);
    const { roomId } = req.params;
    console.log('Uploaded Video:', req.file);

    if (!req.file) {
        console.error('No video uploaded.');
        return res.status(400).send('No video uploaded.');
    }

    // Create an upload stream to the Videos GridFS bucket
    const videoUploadStream = videoBucket.openUploadStream(req.file.originalname);

    // Write the buffer to GridFS
    videoUploadStream.end(req.file.buffer);

    // Handle errors during the upload process
    videoUploadStream.on('error', (error) => {
        console.error('Error uploading video to GridFS:', error);
        req.flash('error', 'Error uploading video. Please try again.');
        return res.redirect(`/admin/lesson/${roomId}`);
    });

    // Handle the finish event
    videoUploadStream.on('finish', async () => {
        try {
            // Retrieve the video file after upload by its filename
            const uploadedVideo = await videoBucket.find({ filename: req.file.originalname }).toArray();

            if (!uploadedVideo || uploadedVideo.length === 0) {
                console.error('Video not found in GridFS after upload.');
                req.flash('error', 'Error saving video reference. Please try again.');
                return res.redirect(`/admin/lesson/${roomId}`);
            }

            const video = uploadedVideo[0];
            console.log('Video uploaded:', video);

            // Add the new video to the lesson's videoFiles array
            await Lesson.findOneAndUpdate(
                { roomId },
                {
                    $push: {
                        videoFiles: {
                            videoFileId: video._id,
                            videoFileName: req.file.originalname
                        }
                    }
                },
                { new: true, upsert: true }
            );

            req.flash('success', 'Video uploaded and saved to the lesson.');
            res.redirect(`/admin/lesson/${roomId}`);
        } catch (error) {
            console.error('Error updating lesson with video ID:', error);
            req.flash('error', 'Error saving video reference. Please try again.');
            res.redirect(`/admin/lesson/${roomId}`);
        }
    });
});


// Route to serve video by file ID from GridFS
router.get('/video/:id', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = videoBucket.openDownloadStream(fileId);

        // Set the response headers to stream the video
        res.set('Content-Type', 'video/mp4'); // Adjust this if your videos are in different formats

        // Pipe the video data to the response
        downloadStream.pipe(res);

        // Handle errors during the download stream
        downloadStream.on('error', () => {
            res.status(404).send('Video not found.');
        });
    } catch (error) {
        console.error('Error retrieving video:', error);
        res.status(500).send('Error retrieving video.');
    }
});
//end of lesson ------------------------------------------------------------------------------------------
// Get activitites for a specific room
router.get('/activities/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const roomId = req.params.roomId;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const lesson = await Lesson.findOne({ roomId }); // Fetch lesson associated with the room
        res.render('admin/activities', { room, lesson }); // Pass lesson data to the view
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});

//end of  activities -------------------------------------------------------------------------------------------
router.get('/educGames/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const roomId = req.params.roomId;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const lesson = await Lesson.findOne({ roomId }); // Fetch lesson associated with the room
        res.render('admin/educGames', { room, lesson }); // Pass lesson data to the view
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});

module.exports = router;