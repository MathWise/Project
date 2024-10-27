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

// Route to handle lessons for a specific room
router.get('/lesson/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const roomId = req.params.roomId;
    console.log('Rendering lesson page for Room ID:', roomId);
    const currentUser = req.user; 
    console.log("Current User:",  currentUser);
 
    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const lesson = await Lesson.findOne({ roomId }); // Fetch lesson associated with the room
        const lessonRooms = await LessonRoom.find({ roomId }); // Fetch lesson rooms associated with the room
        const currentLessonRoom = lessonRooms[0];

        res.render('admin/lesson', { room, lesson, lessonRooms, currentUser }); // Pass lessonRooms to the view
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});

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

const PdfProgress = require('../models/PdfProgress');
const { ObjectId } = require('mongodb'); 

// Route to save PDF reading progress
router.post('/lesson/pdf-progress', ensureLoggedIn, async (req, res) => {
    const userId = req.user?._id || req.body.userId;
    const { pdfFileId, progress } = req.body;

    try {
        const userObjectId = new ObjectId(userId);
        const pdfObjectId = new ObjectId(pdfFileId);

        // Find or create a PdfProgress document
        let pdfProgress = await PdfProgress.findOne({ userId: userObjectId, pdfFileId: pdfObjectId });

        if (!pdfProgress) {
            // Create new document if none exists
            pdfProgress = new PdfProgress({ userId: userObjectId, pdfFileId: pdfObjectId, progress });
        } else if (pdfProgress.progress < 100) {
            // Update if progress is less than 100%
            pdfProgress.progress = progress;
        }

        await pdfProgress.save();
        res.json({ success: true, message: 'Progress saved successfully' });
    } catch (error) {
        console.error('Error saving PDF progress:', error);
        res.status(500).json({ success: false, message: 'Failed to save progress' });
    }
});






// Route to get the saved PDF progress for a user
router.get('/lesson/get-pdf-progress/:userId/:pdfFileId', ensureLoggedIn, async (req, res) => {
    const { userId, pdfFileId } = req.params;

    try {
        const pdfProgress = await PdfProgress.findOne({ userId, pdfFileId });

        if (pdfProgress) {
            res.json({ success: true, progress: pdfProgress.progress });
        } else {
            res.json({ success: true, progress: 0 });
        }
    } catch (error) {
        console.error('Error fetching PDF progress:', error);
        res.status(500).json({ success: false, message: 'Failed to save progress', error: error.message });
    }
});


//end of lesson ------------------------------------------------------------------------------------------

const QuizActivity = require('../models/QuizActivityRoom'); // Correct model for quizzes
const ActivityRoom = require('../models/activityRoom'); // Correct model for activity rooms
const QuizResult = require('../models/QuizResult');

// Route to create an activity or quiz room
router.post('/create-activity-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { subject, activityType } = req.body; 
    const { roomId } = req.params; 

    try {
        const newActivityRoom = new ActivityRoom({
            subject,
            activityType,
            roomId
        });

        await newActivityRoom.save();
        req.flash('success', 'Activity/Quiz room created successfully!');
        res.redirect(`/admin/activities/${roomId}`);
    } catch (err) {
        console.error('Error creating activity room:', err);
        req.flash('error', 'Error creating activity room. Please try again.');
        res.redirect(`/admin/activities/${roomId}`);
    }
});


// Route to handle activities for a specific room
router.get('/activities/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch activity rooms associated with the room
        const activityRooms = await ActivityRoom.find({ roomId });
        const quizzes = await QuizActivity.find({ roomId });
        const quizResults = await QuizResult.find({ roomId }).populate('userId');
        res.render('admin/activities', {
            room,
            activityRooms,
            quizzes: quizzes || [], // Ensure quizzes is defined
            quizResults
        });
        // Pass roomId to the view
    
    } catch (err) {
        console.error('Error accessing activities:', err);
        req.flash('error', 'Error accessing activities.');
        res.redirect('/admin/homeAdmin');
    }
});

// Route to submit a new quiz
router.post('/quiz/create/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    const { title, questions } = req.body; // Ensure this is an array with questionText and choices or correctAnswer

    try {
        // Process each question based on its type
        questions.forEach((question, qIndex) => {
            if (question.type === 'multiple-choice') {
                // For multiple-choice, process choices
                question.choices.forEach((choice, cIndex) => {
                    // Convert "on" to true, and any missing value (unchecked) to false
                    choice.isCorrect = !!choice.isCorrect;
                });
            } else if (question.type === 'fill-in-the-blank') {
                // For fill-in-the-blank, make sure there's a correctAnswer
                if (!question.correctAnswer || question.correctAnswer.trim() === '') {
                    throw new Error(`Fill-in-the-blank question ${qIndex + 1} must have a correct answer.`);
                }
            }
        });

        // Create a new quiz
        const newQuiz = new QuizActivity({
            title,
            roomId,
            questions // Store the questions (both types)
        });

        // Save the quiz to MongoDB
        await newQuiz.save();

        req.flash('success', 'Quiz created successfully!');
        res.redirect(`/admin/activities/${roomId}`);
    } catch (err) {
        console.error('Error creating quiz:', err);
        req.flash('error', `Error creating quiz: ${err.message}`);
        res.redirect(`/admin/activities/${roomId}`);
    }
});






router.get('/quizzes/start/:id', ensureAdminLoggedIn, async (req, res) => {
    const { id } = req.params;

    try {
        const quiz = await QuizActivity.findById(id);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin'); // Redirect if not found
        }

        // Render the quiz start page or whatever view you need
        res.render('quizzes/start', { quiz, currentUserId: req.user._id }); // Pass the quiz variable and user ID
    } catch (err) {
        console.error('Error starting quiz:', err);
        req.flash('error', 'Error starting quiz.');
        res.redirect('/admin/homeAdmin'); // Redirect on error
    }
});



// Route to submit quiz answers
router.post('/quiz/submit/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const { userId, answers } = req.body;

    try {
        const quiz = await QuizActivity.findById(quizId);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin');
        }

        let correctCount = 0;
        const resultAnswers = quiz.questions.map((question, qIndex) => {
            const userAnswer = answers[qIndex];
            let isCorrect = false;

            if (question.type === 'multiple-choice') {
                // For multiple-choice, check if the user's selected answer is correct
                isCorrect = question.choices.some(choice => choice.isCorrect && choice.text === userAnswer);
            } else if (question.type === 'fill-in-the-blank') {
                // For fill-in-the-blank, compare userAnswer with correctAnswer
                isCorrect = question.correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
            }

            if (isCorrect) correctCount++;

            // Return the answer object including questionId and questionText
            return {
                questionId: question._id,
                questionText: question.questionText, // Include the question text
                userAnswer,
                isCorrect
            };
        });

        if (!userId) {
            throw new Error('User ID is required');
        }

        const quizResult = new QuizResult({
            userId, // Store the user ID who took the quiz
            quizId,
            answers: resultAnswers, // Include the answers with questionText
            score: correctCount
        });

        await quizResult.save(); // Save the result in MongoDB

        req.flash('success', `You got ${correctCount} out of ${quiz.questions.length} correct!`);
        res.redirect(`/admin/quizzes/room/${quizId}`);
    } catch (err) {
        console.error('Error submitting quiz:', err);
        req.flash('error', 'Error submitting quiz. ' + err.message);
        res.redirect('/admin');
    }
});


router.get('/quizzes/room/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const currentUserId = req.user._id;  // Get the current user ID
    
    try {
        // Fetch the quiz
        const quiz = await QuizActivity.findById(quizId);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch the quiz result for the current user only
        const quizResult = await QuizResult.findOne({ quizId, userId: currentUserId });

        if (!quizResult) {
            req.flash('error', 'You have not taken this quiz.');
            return res.redirect('/admin/homeAdmin');
        }

        // Render the results page, passing only the result for the current user
        res.render('quizzes/results', { quiz, quizResult });
    } catch (err) {
        console.error('Error fetching quiz result:', err);
        req.flash('error', 'Error fetching quiz result.');
        res.redirect('/admin/homeAdmin');
    }
});



// Route to get quiz participants
router.get('/quiz/participants/:quizId', ensureAdminLoggedIn, async (req, res) => {
    try {
        const { quizId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({ error: 'Invalid Quiz ID.' });
        }
        
        const quizResults = await QuizResult.find({ quizId }).populate('userId');
        
        const participants = quizResults.map(result => ({
            firstName: result.userId.first_name,
            lastName: result.userId.last_name,
            score: result.score,
            submittedAt: result.createdAt
        }));

        res.json(participants);
    } catch (err) {
        console.error('Error fetching quiz participants:', err);
        res.status(500).json({ error: 'Error fetching quiz participants.' });
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