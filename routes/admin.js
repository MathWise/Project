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


        console.log('New room created successfully:', newRoom); // Debugging confirmation

        // Automatically create a default ActivityRoom for the new Room
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,  // Link to the newly created Room
            subject: "Default Subject",  // Use a default subject or customize based on your needs
            activityType: "Quiz",        // Default activity type, e.g., "Quiz"
            createdAt: new Date()
        });
        
        await defaultActivityRoom.save();
        console.log('Default ActivityRoom created successfully:', defaultActivityRoom);

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
            console.error('Invalid roomId format:', roomId);
            req.flash('error', 'Invalid room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        const room = await Room.findById(roomId);
        console.error('Room not found with ID:', roomId);
        if (!room) {
            console.error('Room not found with ID:', roomId);
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






const { DateTime } = require('luxon');
const QuizActivity = require('../models/QuizActivityRoom'); // Correct model for quizzes
const ActivityRoom = require('../models/activityRoom'); // Correct model for activity rooms
const QuizResult = require('../models/QuizResult');

router.post('/create-activity-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { subject, activityType } = req.body;
    const { roomId } = req.params;
    console.log('Received roomId for creating activity:', roomId);

    try {
      
        const newActivityRoom = new ActivityRoom({
            subject,
            activityType,
            roomId: new mongoose.Types.ObjectId(roomId)
        });

        await newActivityRoom.save();
        console.log('Activity created:', newActivityRoom);

        res.redirect(`/admin/activities/${roomId}`);
    } catch (err) {
        console.error('Error creating activity:', err);
        res.redirect('/admin/homeAdmin');
    }
});




router.get('/activities/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    console.log('Received roomId in activities:', roomId);

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.error('Invalid roomId format:', roomId);
        req.flash('error', 'Invalid room ID.');
        return res.redirect('/admin/homeAdmin');
    }

    req.session.submittedQuizzes = [];

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            console.error('Room not found with ID:', roomId);
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }
        console.log('Room found:', room);

        // Fetch all activity rooms with a matching ObjectId for roomId
        const activityRooms = await ActivityRoom.find({ roomId: new mongoose.Types.ObjectId(roomId) });
        console.log(`Found ${activityRooms.length} activity rooms for Room ID:`, roomId);

        if (activityRooms.length === 0) {
            req.flash('error', 'No activity rooms found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch quizzes related to these activity rooms if needed
        const quizzes = await QuizActivity.find({ roomId: { $in: activityRooms.map(ar => ar._id) } });

        res.render('admin/activities', {
            room,
            activityRooms,
            quizzes: quizzes || []
        });
    } catch (err) {
        console.error('Error accessing activities:', err);
        req.flash('error', 'Error accessing activities.');
        res.redirect('/admin/homeAdmin');
    }
});



// API route to fetch quizzes for a specific activity room
router.get('/activities/data/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    console.log('Fetching quizzes for room:', roomId); // Add logging

    try {
        // Fetch quizzes associated with the roomId
        const quizzes = await QuizActivity.find({ roomId: new mongoose.Types.ObjectId(roomId) });


        if (!quizzes || quizzes.length === 0) {
            console.log('No quizzes found for room:', roomId);
        }

        res.json({ quizzes });
    } catch (err) {
        console.error('Error fetching quizzes:', err);
        res.status(500).json({ message: 'Error fetching quizzes.' });
    }
});


// Route to submit a new quiz
router.post('/quiz/create', ensureAdminLoggedIn, async (req, res) => {

    const { activityRoomId, title, questions, timer, deadline, maxAttempts = 5 } = req.body;
    console.log('Creating quiz with received deadline:', deadline);  // Log the received deadline

    try {
        const activityRoom = await ActivityRoom.findById(activityRoomId);
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/activities');
        }

        // Process each question based on its type (multiple-choice or fill-in-the-blank)
        questions.forEach((question, qIndex) => {
            if (question.type === 'multiple-choice') {
                question.choices.forEach((choice) => {
                    choice.isCorrect = !!choice.isCorrect;
                });
            } else if (question.type === 'fill-in-the-blank') {
                if (!question.correctAnswer || question.correctAnswer.trim() === '') {
                    throw new Error(`Fill-in-the-blank question ${qIndex + 1} must have a correct answer.`);
                }
            }
        });

        // Parse deadline in 'Asia/Manila' timezone and convert to UTC if provided
        const deadlineUTC = deadline
            ? DateTime.fromISO(deadline, { zone: 'Asia/Manila' }).toUTC().toJSDate()
            : null;

        if (deadline && isNaN(deadlineUTC)) {
            throw new Error('Invalid deadline format. Please enter a valid date.');
        }

        const newQuiz = new QuizActivity({
            title,
            roomId: new mongoose.Types.ObjectId(activityRoomId),  // Ensures ObjectId format
            questions,
            timer: timer ? parseInt(timer, 10) : null,
            deadline: deadlineUTC,
            maxAttempts: parseInt(maxAttempts, 10)
        });

        await newQuiz.save();
        req.flash('success', 'Quiz created successfully!');
        res.redirect('/admin/activities/' + activityRoom.roomId);

    } catch (err) {
        console.error('Error creating quiz:', err);
        req.flash('error', `Error creating quiz: ${err.message}`);
        res.redirect(`/admin/activities/${activityRoomId || ''}`);
    }
});


// Start quiz route with consistent ObjectId usage
router.get('/quizzes/start/:id', ensureAdminLoggedIn, async (req, res) => {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
        const quiz = await QuizActivity.findById(id);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const attemptCount = await QuizResult.countDocuments({
            quizId: new mongoose.Types.ObjectId(id),
            userId,
            isSubmitted: true
        });

        const attemptsLeft = quiz.maxAttempts - attemptCount;
        console.log(`Attempt count for user ${userId} on quiz ${id}: ${attemptCount}, attempts left: ${attemptsLeft}`);

        if (attemptCount >= quiz.maxAttempts) {
            req.flash('error', `You have reached the maximum of ${quiz.maxAttempts} attempts for this quiz.`);
            return res.redirect('/admin/quizzes/result/' + id);
        }

        req.session.quizStartTime = Date.now();

        res.render('quizzes/start', {
            quiz,
            currentUserId: userId,
            quizStartTime: req.session.quizStartTime,
            maxAttempts: quiz.maxAttempts,
            attemptsLeft: attemptsLeft
        });
    } catch (err) {
        console.error('Error starting quiz:', err);
        req.flash('error', 'Error starting quiz.');
        res.redirect('/admin/homeAdmin');
    }
});

// Submit quiz route with enhanced debug logging
router.post('/quiz/submit/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const { answers = [] } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
        const quiz = await QuizActivity.findById(quizId);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const attemptCount = await QuizResult.countDocuments({
            quizId: new mongoose.Types.ObjectId(quizId),
            userId,
            isSubmitted: true
        });
        console.log(`Attempt count before submission for user ${userId} on quiz ${quizId}: ${attemptCount}`);

        if (attemptCount >= quiz.maxAttempts) {
            req.flash('error', 'You have reached the maximum allowed attempts.');
            return res.redirect(`/admin/quizzes/result/${quizId}`);
        }

        let correctCount = 0;
        const resultAnswers = quiz.questions.map((question, qIndex) => {
            const userAnswer = answers[qIndex] || 'No answer provided';
            let isCorrect = false;

            if (userAnswer !== 'No answer provided') {
                if (question.type === 'multiple-choice') {
                    isCorrect = question.choices.some(choice => choice.isCorrect && choice.text === userAnswer);
                } else if (question.type === 'fill-in-the-blank') {
                    isCorrect = question.correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
                }
            }

            if (isCorrect) correctCount++;

            return {
                questionId: question._id,
                questionText: question.questionText,
                userAnswer,
                isCorrect
            };
        });

        const isLate = quiz.deadline && DateTime.now().toUTC() > DateTime.fromJSDate(quiz.deadline).toUTC();

        const quizResult = new QuizResult({
            userId,
            quizId: new mongoose.Types.ObjectId(quizId),
            answers: resultAnswers,
            score: correctCount,
            isSubmitted: true,
            isLate,
            submittedAt: DateTime.now().toUTC().toJSDate()
        });

        await quizResult.save();
        console.log(`New QuizResult saved for user ${userId} on quiz ${quizId}.`);

        const savedQuizResult = await QuizResult.findById(quizResult._id);
        console.log(`Verified QuizResult for user ${userId} on quiz ${quizId}:`, {
            isSubmitted: savedQuizResult.isSubmitted,
            score: savedQuizResult.score,
            submittedAt: savedQuizResult.submittedAt
        });

        req.flash('success', `You got ${correctCount} out of ${quiz.questions.length} correct!`);
        return res.redirect(`/admin/quizzes/result/${quizId}`);
    } catch (err) {
        console.error('Error submitting quiz:', err);
        req.flash('error', 'Error submitting quiz. ' + err.message);
        return res.redirect('/admin/homeAdmin');
    }
});





// Result route with attempt tracking
router.get('/quizzes/result/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const quiz = await QuizActivity.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const activityRoom = await ActivityRoom.findById(quiz.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const attemptCount = await QuizResult.countDocuments({ 
            quizId: new mongoose.Types.ObjectId(quizId), 
            userId, 
            isSubmitted: true 
        });
        const quizResult = await QuizResult.findOne({ 
            quizId: new mongoose.Types.ObjectId(quizId), 
            userId 
        }).sort({ submittedAt: -1 });

        if (!quizResult) {
            req.flash('error', 'Quiz result not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const attemptsLeft = quiz.maxAttempts - attemptCount;

        res.render('quizzes/results', { quiz, quizResult, attemptsLeft, roomId: activityRoom.roomId });
    } catch (err) {
        console.error('Error fetching quiz result:', err);
        req.flash('error', 'Error fetching quiz result.');
        return res.redirect('/admin/homeAdmin');
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