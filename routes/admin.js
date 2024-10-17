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
    console.log('Rendering lesson page for Room ID:', roomId);

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const lesson = await Lesson.findOne({ roomId }); // Fetch lesson associated with the room
        const lessonRooms = await LessonRoom.find({ roomId }); // Fetch lesson rooms associated with the room

        res.render('admin/lesson', { room, lesson, lessonRooms }); // Pass lessonRooms to the view
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

// Route to create a lessonRoom for a specific room
router.post('/create-lesson-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { subject, topic } = req.body;
    const { roomId } = req.params;

    try {
        const newLessonRoom = new LessonRoom({
            subject,
            topic,
            roomId // Associate the lessonRoom with the room
        });

        await newLessonRoom.save();
        req.flash('success', 'Lesson room created successfully!');
        res.redirect(`/admin/lesson/${roomId}`);
    } catch (err) {
        console.error('Error creating lesson room:', err);
        req.flash('error', 'Error creating lesson room.');
        res.redirect(`/admin/lesson/${roomId}`);
    }
});
router.get('/get-lessons/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        const lesson = await Lesson.findOne({ roomId });

        if (!lesson) {
            return res.status(404).json({ message: 'No lessons found for this room.' });
        }

        // Send the lesson's PDF and video data as JSON
        res.json({
            pdfFiles: lesson.pdfFiles,
            videoFiles: lesson.videoFiles
        });
    } catch (err) {
        console.error('Error fetching lessons:', err);
        res.status(500).json({ message: 'Error fetching lessons.' });
    }
});


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
    console.log('Room ID:', roomId);
    console.log('Uploaded File:', req.file);

    if (!req.file) {
        console.error('No file uploaded.');
        req.flash('error', 'No file uploaded. Please select a file to upload.');
        console.log('Redirecting to lesson page due to no file.');
        return res.redirect(`/admin/lesson/${roomId}`);
    }

    // Create an upload stream to the PDFs GridFS bucket
    const filename = `${roomId}-${req.file.originalname}`;
    const uploadStream = pdfBucket.openUploadStream(filename);

    // Write the buffer to GridFS
    uploadStream.end(req.file.buffer);

    // Handle errors during the upload process
    uploadStream.on('error', (error) => {
        console.error('Error uploading file to GridFS:', error);
        req.flash('error', 'Error uploading PDF. Please try again.');
        console.log('Redirecting to lesson page due to upload error.');
        return res.redirect(`/admin/lesson/${roomId}`);
    });

    // Handle the finish event
    uploadStream.on('finish', async () => {
        try {
            const uploadedFile = await pdfBucket.find({ filename }).toArray();

            if (!uploadedFile || uploadedFile.length === 0) {
                console.error('File not found in GridFS after upload.');
                req.flash('error', 'Error saving file reference. Please try again.');
                console.log('Redirecting to lesson page due to file not found.');
                return res.redirect(`/admin/lesson/${roomId}`);
            }

            const file = uploadedFile[0];
            console.log('File uploaded:', file);

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
            console.log('Redirecting to lesson page after successful upload.');
            res.redirect(`/admin/lesson/${roomId}`);
        } catch (error) {
            console.error('Error updating lesson with file ID:', error);
            req.flash('error', 'Error saving file reference. Please try again.');
            console.log('Redirecting to lesson page due to update error.');
            return res.redirect(`/admin/lesson/${roomId}`);
        }
    });
});



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
    const { roomId } = req.params;

    if (!req.file) {
        req.flash('error', 'No video uploaded.');
        return res.status(400).json({ error: 'No video uploaded.' }); // Change to JSON response
    }

    const videoUploadStream = videoBucket.openUploadStream(req.file.originalname);

    videoUploadStream.end(req.file.buffer);

    videoUploadStream.on('error', (error) => {
        console.error('Error uploading video to GridFS:', error);
        req.flash('error', 'Error uploading video. Please try again.');
        return res.status(500).json({ error: 'Error uploading video.' }); // Change to JSON response
    });

    videoUploadStream.on('finish', async () => {
        try {
            const uploadedVideo = await videoBucket.find({ filename: req.file.originalname }).toArray();

            if (!uploadedVideo || uploadedVideo.length === 0) {
                req.flash('error', 'Error saving video reference. Please try again.');
                return res.status(500).json({ error: 'Error saving video reference.' }); // Change to JSON response
            }

            const video = uploadedVideo[0];

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
            return res.status(200).json({ message: 'Video uploaded successfully.', videoFiles: [{ videoFileId: video._id, videoFileName: req.file.originalname }] }); // Return JSON
        } catch (error) {
            console.error('Error updating lesson with video ID:', error);
            req.flash('error', 'Error saving video reference. Please try again.');
            return res.status(500).json({ error: 'Error saving video reference.' }); // Change to JSON response
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