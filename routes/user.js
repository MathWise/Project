
const multer = require('multer');
const { MongoClient, GridFSBucket } = require('mongodb');
const express = require('express');
const Lesson = require('../models/lesson.js');
const Video = require('../models/video'); 
const mongoose = require('mongoose');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getPdfBucket, getVideoBucket, initBuckets } = require('../config/gridFS');
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const middleware = require('../middleware');
const { ensureLoggedIn,  ensureStudentLoggedIn } = middleware;
const User = require('../models/user'); 
const connectDB = require('../config/dbConnection');
const mongoURI = process.env.MONGODB_URI;
const { DateTime } = require('luxon');
const Quiz = require('../models/QuizActivityRoom'); 
const ActivityRoom = require('../models/activityRoom'); 
const QuizResult = require('../models/QuizResult');
const PdfProgress = require('../models/PdfProgress');
const { ObjectId } = require('mongodb'); 
const Activity = require('../models/activityM.js');
const { archiveItem, cascadeArchive, cascadeUnarchive, cascadeDelete } = require('../utils/archiveHelper');


// Route to grant access to a specific room
router.post('/grant-access/:roomId', ensureLoggedIn, (req, res) => {
    const { roomId } = req.params;

    // Initialize session roomAccess object if it doesn't exist
    if (!req.session.roomAccess) {
        req.session.roomAccess = {};
    }

    // Store the room access in the session
    req.session.roomAccess[roomId] = true;
    res.status(200).send('Access granted');
});


// Render the homeAdmin page with room creation and existing rooms
router.get('/homeUser', ensureLoggedIn, async (req, res) => {
    const { search } = req.query;

    try {
        let query = { isArchived: false }; // Default: fetch non-archived rooms

        // If search query exists, filter by room name or teacher
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive regex
            query.$or = [
                { name: searchRegex },
                { teacherName: searchRegex }
            ];
        }

        const rooms = await Room.find(query).sort({ gradeLevel: 1 });

        res.render('user/homeUser', {
            rooms,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error'),
            searchQuery: search || '' 
        });
    } catch (err) {
       
        req.flash('error', 'Error fetching rooms.');
        res.redirect('/error'); // Redirect to error page if something goes wrong
    }
});


// Get dashboard for a specific room
router.get('/dashboard/:roomId', ensureStudentLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user._id;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/user/homeUser');
        }


        // Fetch the latest PDF completion progress
        const latestCompletedPdfProgress = await PdfProgress.findOne({ userId, progress: 100 })
            .sort({ updatedAt: -1 });

       

        let latestCompletedPdf = null;

        if (latestCompletedPdfProgress) {
            // Find the Lesson containing the completed PDF based only on pdfFileId
            const lesson = await Lesson.findOne({ 'pdfFiles.pdfFileId': latestCompletedPdfProgress.pdfFileId });
            

            if (lesson) {
                latestCompletedPdf = lesson.pdfFiles.find(
                    (pdf) => pdf.pdfFileId.toString() === latestCompletedPdfProgress.pdfFileId.toString()
                );
            }
        }

  

        const lessonRooms = await LessonRoom.find({ roomId });
        if (!lessonRooms || lessonRooms.length === 0) {
            req.flash('error', 'No lesson rooms found for this room.');
            return res.render('user/dashboard', { room, quizAnalytics: [], latestPdf: null, latestVideo: null, latestCompletedPdf: null });
        }

        // Fetch lessons associated with lesson rooms
        const lessonRoomIds = lessonRooms.map(lr => lr._id);
        const lessons = await Lesson.find({ roomId: { $in: lessonRoomIds } });

        // Find the latest PDF
        let latestPdf = null;

        lessons.forEach(lesson => {
            if (lesson.pdfFiles && lesson.pdfFiles.length > 0) {
                lesson.pdfFiles.forEach(pdf => {
                    const pdfTimestamp = pdf.updatedAt || pdf._id.getTimestamp();
                    if (!latestPdf || pdfTimestamp > (latestPdf.updatedAt || latestPdf._id.getTimestamp())) {
                        latestPdf = pdf; // Update to the most recent PDF
                    }
                });
            }
        });



        const videoDocuments = await Video.find({ roomId: { $in: lessonRoomIds } });

        let latestVideo = null;
        
        if (videoDocuments && videoDocuments.length > 0) {
            // Flatten all videoFiles across videoDocuments
            const allVideos = videoDocuments.flatMap(doc => doc.videoFiles);
        
            if (allVideos.length > 0) {
                // Sort all videos by updatedAt or _id timestamp
                const sortedVideos = allVideos.sort((a, b) => 
                    (b.updatedAt || b._id.getTimestamp()) - (a.updatedAt || a._id.getTimestamp())
                );
                latestVideo = sortedVideos[0]; // Pick the most recent video
            }
        }
        



        const activityRooms = await ActivityRoom.find({ roomId });
        const activityRoomIds = activityRooms.map(ar => ar._id);

        const quizzes = await Quiz.find({ roomId: { $in: activityRoomIds } });

        const latestQuiz = quizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;



        const quizAnalytics = await Promise.all(
            quizzes.map(async (quiz) => {
                const results = await QuizResult.find({ quizId: quiz._id });
                if (results.length === 0) {
                    return { quizTitle: quiz.title, dataAvailable: false, createdAt: quiz.createdAt };
                }

                const scores = results.map(result => result.score);
                const totalScore = quiz.questions.length;

                const averageScore = (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2);
                scores.sort((a, b) => a - b);
                const medianScore = scores.length % 2 === 0
                    ? ((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2).toFixed(2)
                    : scores[Math.floor(scores.length / 2)];
                const range = `${Math.min(...scores)} - ${Math.max(...scores)}`;
                
                const scoreDistribution = Array(totalScore + 1).fill(0);
                scores.forEach(score => scoreDistribution[score]++);

                return {
                    quizTitle: quiz.title,
                    averageScore,
                    medianScore,
                    range,
                    scoreDistribution,
                    totalScore,
                    dataAvailable: true,
                    createdAt: quiz.createdAt  
                };
            })
        );

        quizAnalytics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render('user/dashboard', { room, quizAnalytics, latestPdf, latestVideo, latestCompletedPdf, latestQuiz });
        
    } catch (err) {

        req.flash('error', 'Error accessing the dashboard.');
        res.redirect('/user/homeUser');
    }
});

//end of user dashboard --------------------------------------------------------------------------



















// Route to handle lessons for a specific room
router.get('/lesson/:roomId', ensureStudentLoggedIn,  async (req, res) => {
    const { roomId } = req.params;


    const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
    if (!roomObjectId) {

        req.flash('error', 'Invalid room ID format.');
        return res.redirect('/user/homeUser');
    }

    try {
        // Fetch room to ensure it exists
        const room = await Room.findById(roomObjectId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/user/homeUser');
        }

        // Find associated LessonRooms
        const lessonRooms = await LessonRoom.find({ roomId: roomObjectId, archived: false });
        if (!lessonRooms || lessonRooms.length === 0) {
            console.warn('No LessonRooms found for the room.');
        }

        // Extract LessonRoom IDs
        const lessonRoomIds = lessonRooms.map((lr) => lr._id);

        // Find Lessons and Videos associated with LessonRooms
        const lessons = await Lesson.find({ roomId: { $in: lessonRoomIds } });
        const videos = await Video.find({ roomId: { $in: lessonRoomIds } });



        // Render the lesson page with the data
        res.render('user/lesson', {
            room,
            lessonRooms,
            lessons,
            videos,
            currentUser: req.user,
        });
    } catch (err) {

        req.flash('error', 'Error accessing the room.');
        res.redirect('/user/homeUser');
    }
});





router.get('/get-lessons/:roomId', ensureStudentLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;

    if (!roomObjectId) {

        return res.status(400).send('Invalid roomId format');
    }

    try {
        // Check if roomId is a Room
        const room = await Room.findById(roomObjectId);
        if (room) {
            // Query LessonRooms for the Room
            const lessonRooms = await LessonRoom.find({ roomId: roomObjectId, archived: false });
            if (!lessonRooms || lessonRooms.length === 0) {
   
                return res.json({ pdfFiles: [], videoFiles: [] });
            }

            // Collect LessonRoom IDs and query associated Lessons and Videos
            const lessonRoomIds = lessonRooms.map((lr) => lr._id);
            const lessons = await Lesson.find({ roomId: { $in: lessonRoomIds } });
            const videos = await Video.find({ roomId: { $in: lessonRoomIds } });

            const pdfFiles = lessons.flatMap((lesson) => 
                lesson.pdfFiles.filter((pdf) => !pdf.archived)
            );
            const videoFiles = videos.flatMap((video) => 
                video.videoFiles.filter((vid) => !vid.archived)
            );



            return res.json({ pdfFiles, videoFiles });
        }

        // If roomId is not a Room, check if it's a LessonRoom
        const lessonRoom = await LessonRoom.findById(roomObjectId);
        if (!lessonRoom) {

            return res.status(404).send('Room or LessonRoom not found.');
        }

        // Query Lessons and Videos for the specific LessonRoom
        const lessons = await Lesson.find({ roomId: lessonRoom._id });
        const videos = await Video.find({ roomId: lessonRoom._id });

        const pdfFiles = lessons.flatMap((lesson) =>
            lesson.pdfFiles.filter((pdf) => !pdf.archived)
        );
        const videoFiles = videos.flatMap((video) =>
            video.videoFiles.filter((vid) => !vid.archived)
        );



        res.json({ pdfFiles, videoFiles });
    } catch (error) {

        res.status(500).json({ message: 'Error fetching lessons' });
    }
});


initBuckets();


// Set up multer storage in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to serve PDF by file ID from GridFS
router.get('/pdf/:id', async (req, res) => {
    try {
        const pdfBucket = getPdfBucket();  // Use the getter
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = pdfBucket.openDownloadStream(fileId);

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline');
        downloadStream.pipe(res);

        downloadStream.on('error', () => {
            res.status(404).send('File not found.');
        });
    } catch (error) {

        res.status(500).send('Error retrieving file.');
    }
});



// Route to serve video by file ID from GridFS
router.get('/video/:id', async (req, res) => {
    try {
        const videoBucket = getVideoBucket();  // Use the getter
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = videoBucket.openDownloadStream(fileId);

        res.set('Content-Type', 'video/mp4');
        downloadStream.pipe(res);

        downloadStream.on('error', () => {
            res.status(404).send('Video not found.');
        });
    } catch (error) {

        res.status(500).send('Error retrieving video.');
    }
});



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

        res.status(500).json({ success: false, message: 'Failed to save progress', error: error.message });
    }
});

//end of user activity-----------------------------------------------------------------------------------------


















router.get('/activities/:roomId',ensureStudentLoggedIn,  async (req, res) => {
    const { roomId } = req.params;
    console.log('Received roomId in activities:', roomId);

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.error('Invalid roomId format:', roomId);
        req.flash('error', 'Invalid room ID.');
        return res.redirect('/user/homeUser');
    }

    req.session.submittedQuizzes = [];

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            console.error('Room not found with ID:', roomId);
            req.flash('error', 'Room not found.');
            return res.redirect('/user/homeUser');
        }
        console.log('Room found:', room);

        // Fetch all activity rooms (including archived) for the room
        const allActivityRooms = await ActivityRoom.find({ roomId: new mongoose.Types.ObjectId(roomId) });
        
        if (allActivityRooms.length === 0) {
            req.flash('error', 'No activity rooms found.');
            return res.redirect('/user/homeUser');
        }

        
        // Filter non-archived activity rooms to display
        const activityRooms = allActivityRooms.filter(room => !room.archived);


        // Get IDs of all non-archived activity rooms
        const activityRoomIds = activityRooms.map(ar => ar._id);

        // Modify quiz query based on user role
        const quizQuery = { roomId: { $in: activityRoomIds }, archived: false };
        if (req.user.role !== 'admin') {
            quizQuery.isDraft = false; // Exclude drafts for non-admins
        }
        // Fetch quizzes and activities related to the activity rooms
        const [quizzes, activities] = await Promise.all([
            Quiz.find({ roomId: { $in: activityRoomIds }, archived: false }),
            Activity.find({ roomId: { $in: activityRoomIds }, archived: false }),
        ]);

        res.render('user/activities', {
            room,
            activityRooms,
            quizzes: quizzes || [],
            activities: activities || []
        });
    } catch (err) {
        console.error('Error accessing activities:', err);
        req.flash('error', 'Error accessing activities.');
        res.redirect('/user/homeUser');
    }
});





router.get('/activities/data/:roomId', ensureLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ message: 'Invalid room ID.' });
        }

        const isAdmin = req.user.role === 'admin';
        const baseQuery = { roomId: new mongoose.Types.ObjectId(roomId), archived: false };

        // Add `isDraft` filter for non-admins
        const quizQuery = { ...baseQuery, ...(isAdmin ? {} : { isDraft: false }) };
        const activityQuery = { ...baseQuery, ...(isAdmin ? {} : { isDraft: false }) };

        const [quizzes, activities] = await Promise.all([
            Quiz.find(quizQuery),
            Activity.find(activityQuery)
        ]);

        console.log('Quizzes fetched:', quizzes.length);
        console.log('Activities fetched:', activities.length);

        res.json({ quizzes, activities });
    } catch (err) {
        console.error('Error fetching quizzes and activities:', err);
        res.status(500).json({ message: 'Error fetching data.' });
    }
});





// Start quiz route with consistent ObjectId usage
router.get('/quizzes/userStart/:id', ensureStudentLoggedIn, async (req, res) => {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/user/homeUser');
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
            return res.redirect('/user/quizzes/userResult/' + id);
        }

         // Reset quizStartTime if starting a new quiz or if it's missing
         if (!req.session.quizStartTime || req.session.currentQuizId !== id) {
            req.session.quizStartTime = Date.now();
            req.session.currentQuizId = id;  // Track current quiz ID to handle new quiz starts
        }
        res.render('quizzes/userStart', {
            quiz,
            currentUserId: userId,
            quizStartTime: req.session.quizStartTime,
            maxAttempts: quiz.maxAttempts,
            attemptsLeft: attemptsLeft
        });
    } catch (err) {
        console.error('Error starting quiz:', err);
        req.flash('error', 'Error starting quiz.');
        res.redirect('/user/homeUser');
    }
});






// Submit quiz route with enhanced debug logging
router.post('/quiz/submit/:quizId', ensureStudentLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const { answers = [] } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/user/homeUser');
        }

        const attemptCount = await QuizResult.countDocuments({
            quizId: new mongoose.Types.ObjectId(quizId),
            userId,
            isSubmitted: true
        });
        console.log(`Attempt count before submission for user ${userId} on quiz ${quizId}: ${attemptCount}`);

        if (attemptCount >= quiz.maxAttempts) {
            req.flash('error', 'You have reached the maximum allowed attempts.');
            return res.redirect(`/user/quizzes/userResult/${quizId}`);
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

        // Clear quizStartTime and currentQuizId after submission
        delete req.session.quizStartTime;
        delete req.session.currentQuizId;

        req.flash('success', `You got ${correctCount} out of ${quiz.questions.length} correct!`);
        return res.redirect(`/user/quizzes/userResult/${quizId}`);
    } catch (err) {
        console.error('Error submitting quiz:', err);
        req.flash('error', 'Error submitting quiz. ' + err.message);
        return res.redirect('/user/homeUser');
    }
});



// Result route with attempt tracking
router.get('/quizzes/userResult/:quizId', ensureStudentLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/user/homeUser');
        }

        const activityRoom = await ActivityRoom.findById(quiz.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/user/homeUser');
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
            return res.redirect('/user/homeUser');
        }

        const attemptsLeft = quiz.maxAttempts - attemptCount;

        res.render('quizzes/userResults', { quiz, quizResult, attemptsLeft, roomId: activityRoom.roomId });
    } catch (err) {
        console.error('Error fetching quiz result:', err);
        req.flash('error', 'Error fetching quiz result.');
        return res.redirect('/user/homeUser');
    }
});


//end of user activity-----------------------------------------------------------------------------------------



module.exports = router;
