//   /routes/admin.js
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
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;
const User = require('../models/user'); 
const connectDB = require('../config/dbConnection');
const mongoURI = process.env.MONGODB_URI;
const { DateTime } = require('luxon');
const Quiz = require('../models/QuizActivityRoom'); 
const ActivityRoom = require('../models/activityRoom'); 
const QuizResult = require('../models/QuizResult');
const PdfProgress = require('../models/PdfProgress');
const { ObjectId } = require('mongodb'); 
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
router.get('/homeAdmin', ensureLoggedIn, async (req, res) => {
   

    try {
        const rooms = await Room.find({ isArchived: false }); // Only fetch non-archived rooms
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
        // Step 1: Create a new Room
        const newRoom = new Room({ name, gradeLevel, teacherName, roomPassword });
        await newRoom.save();
        console.log('New room created successfully:', newRoom);

        // Step 2: Create a default ActivityRoom for quizzes
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await defaultActivityRoom.save();
        console.log('Default ActivityRoom created successfully:', defaultActivityRoom);

        // Step 3: Create a default LessonRoom
        const defaultLessonRoom = new LessonRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            topic: "Sample Topic",
            archived: false,
        });
        await defaultLessonRoom.save();
        console.log('Default LessonRoom created successfully:', defaultLessonRoom);

        // Step 4: Upload default PDF to GridFS
        const pdfPath = path.join(__dirname, '../public/defaults/sample.pdf'); // Path to default PDF
        const pdfBucket = getPdfBucket();
        const pdfStream = fs.createReadStream(pdfPath);

        const pdfUpload = new Promise((resolve, reject) => {
            const uploadPdfStream = pdfBucket.openUploadStream('sample.pdf', {
                metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom._id },
            });

            pdfStream.pipe(uploadPdfStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await pdfUpload;

        const pdfFile = await pdfBucket.find({ filename: 'sample.pdf' }).toArray();
        if (!pdfFile.length) throw new Error('PDF upload failed');

        console.log('Default PDF uploaded successfully:', pdfFile[0]);

        // Step 5: Create a Lesson associated with the default LessonRoom
        const defaultLesson = new Lesson({
            roomId: defaultLessonRoom._id,
            pdfFiles: [
                {
                    pdfFileId: pdfFile[0]._id,
                    pdfFileName: 'sample.pdf',
                    archived: false,
                },
            ],
        });

        await defaultLesson.save();
        console.log('Default Lesson created successfully:', defaultLesson);

        // Step 6: Upload default video to GridFS
        const videoPath = path.join(__dirname, '../public/defaults/sampleVideo.mp4');
        const videoBucket = getVideoBucket();
        const videoStream = fs.createReadStream(videoPath);

        const videoUpload = new Promise((resolve, reject) => {
            const uploadVideoStream = videoBucket.openUploadStream('sampleVideo.mp4', {
                metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom._id },
            });

            videoStream.pipe(uploadVideoStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await videoUpload;

        // Fetch the uploaded video file from GridFS
        const videoFile = await videoBucket.find({ filename: 'sampleVideo.mp4' }).toArray();
        if (!videoFile.length) throw new Error('Video upload failed');

        console.log('Default video uploaded successfully:', videoFile[0]);

        // Step 7: Create a Video document for the LessonRoom
        const defaultVideo = new Video({
            roomId: defaultLessonRoom._id,
            videoFiles: [
                {
                    videoFileId: videoFile[0]._id,
                    videoFileName: 'sampleVideo.mp4',
                    archived: false,
                },
            ],
        });

        await defaultVideo.save();
        console.log('Default Video created successfully:', defaultVideo);


        // Step 7: Define default quizzes by difficulty level
        const quizzes = [
            {
                title: "Sample Quiz - Easy",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "easy",
                questions: [
                    {
                        questionText: "What is 5 + 3?",
                        type: "fill-in-the-blank",
                        correctAnswer: "8"
                    },
                    {
                        questionText: "What is the color of the sky?",
                        type: "multiple-choice",
                        choices: [
                            { text: "Blue", isCorrect: true },
                            { text: "Green", isCorrect: false },
                            { text: "Yellow", isCorrect: false },
                            { text: "Red", isCorrect: false }
                        ]
                    }
                ],
                timer: 5, // Easy quiz timer (in minutes)
                maxAttempts: 3
            },
            {
                title: "Sample Quiz - Medium",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "medium",
                questions: [
                    {
                        questionText: "What is the capital of Germany?",
                        type: "multiple-choice",
                        choices: [
                            { text: "Berlin", isCorrect: true },
                            { text: "Munich", isCorrect: false },
                            { text: "Frankfurt", isCorrect: false },
                            { text: "Hamburg", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "Solve for x: 3x = 12",
                        type: "fill-in-the-blank",
                        correctAnswer: "4"
                    }
                ],
                timer: 10, // Medium quiz timer (in minutes)
                maxAttempts: 3
            },
            {
                title: "Sample Quiz - Hard",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "hard",
                questions: [
                    {
                        questionText: "What is the derivative of x^2?",
                        type: "fill-in-the-blank",
                        correctAnswer: "2x"
                    },
                    {
                        questionText: "Who developed the theory of relativity?",
                        type: "multiple-choice",
                        choices: [
                            { text: "Albert Einstein", isCorrect: true },
                            { text: "Isaac Newton", isCorrect: false },
                            { text: "Galileo Galilei", isCorrect: false },
                            { text: "Marie Curie", isCorrect: false }
                        ]
                    }
                ],
                timer: 15, // Hard quiz timer (in minutes)
                maxAttempts: 3
            }
        ];

       
        for (const quizData of quizzes) {
            const newQuiz = new Quiz(quizData);
            await newQuiz.save();
            console.log(`Default Quiz - ${quizData.difficultyLevel} created successfully:`, newQuiz);
        }

        // Step 8: Flash success message and redirect
        req.flash('success', 'Room, default quizzes, and default lesson room with media created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error('Error creating room and associated resources:', err);
        req.flash('error', 'Error creating room and associated resources. Please try again.');
        res.redirect('/admin/homeAdmin');
    }
});

// end of home Admin-----------------------------------------------------------------------------------------------------------------












// Route to manage user access
router.get('/manage-access', ensureAdminLoggedIn, async (req, res) => {
    const successMessage = req.flash('success') || [];
    const errorMessage = req.flash('error');
    try {
        const users = await User.find();
        res.render('admin/manageAccess', {
            users,
            successMessage,
            errorMessage
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



router.post('/archive-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    const { roomPassword } = req.body; // Password entered by the user
    
    try {
        // Find the room by ID
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Check if the entered password matches the room's password
        if (room.roomPassword !== roomPassword) {
            req.flash('error', 'Incorrect password. Cannot archive the room.');
            return res.redirect('/admin/homeAdmin');
        }

        // Archive the room itself
        await archiveItem(Room, roomId);
        // Archive all associated items
        await cascadeArchive(roomId);

        req.flash('success', 'Room and related items archived successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error('Error archiving room:', err);
        req.flash('error', 'Error archiving room.');
        res.redirect('/admin/homeAdmin');
    }
});


// Unarchive a room
router.post('/unarchive-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Unarchive the room itself
        await Room.findByIdAndUpdate(roomId, { isArchived: false });
        // Unarchive all associated items
        await cascadeUnarchive(roomId);

        req.flash('success', 'Room and related items restored successfully!');
    } catch (err) {
        console.error('Error restoring room:', err);
        req.flash('error', 'Error restoring room.');
    }
    res.redirect('/admin/Archive');
});


// Render the archive page with archived rooms and their related archived content
router.get('/Archive', ensureLoggedIn, async (req, res) => {
    try {
        // Fetch all archived rooms
        const rooms = await Room.find({ isArchived: true });

        // Fetch related archived content for each room
        const roomDetails = await Promise.all(
            rooms.map(async (room) => {
                const lessons = await Lesson.find({ roomId: room._id, "pdfFiles.archived": true });
                const videos = await Video.find({ roomId: room._id, "videoFiles.archived": true });

                  // Add `videoFiles` to each lesson based on roomId or lessonId
                const lessonsWithVideos = lessons.map(lesson => {
                    const relatedVideos = videos.find(video => video.roomId.equals(lesson.roomId));
                    return {
                        ...lesson.toObject(),
                        videoFiles: relatedVideos ? relatedVideos.videoFiles : [],
                    };
                });

                const quizzes = await Quiz.find({ roomId: room._id, archived: true });
                const activities = await ActivityRoom.find({ roomId: room._id, archived: true });
                
                // Return room details along with related archived content
                return { ...room.toObject(), lessons, quizzes, activities };
            })
        );

        // Render the archive page with rooms and their archived content
        res.render('admin/archive', {
            rooms: roomDetails,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error')
        });
    } catch (err) {
        console.error('Error fetching archived rooms:', err);
        req.flash('error', 'Error fetching archived rooms.');
        res.redirect('/error');
    }
});

// Route to delete a specific room from the database
router.post('/delete-room/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    const { roomPassword } = req.body;

    try {
        // Step 1: Verify the room exists
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/Archive');
        }

        // Step 2: Verify the password
        if (room.roomPassword !== roomPassword) {
            req.flash('error', 'Incorrect password. Room deletion canceled.');
            return res.redirect('/admin/Archive');
        }

        // Step 3: Delete the room and related data from the database
        console.log(`Deleting room with ID: ${roomId}`);
        await Room.findByIdAndDelete(roomId);
        console.log('Room deleted successfully.');

        console.log(`Deleting associated LessonRooms for room ID: ${roomId}`);
        await LessonRoom.deleteMany({ roomId });        // Delete related lesson rooms
        console.log('Associated LessonRooms deleted successfully.');

        console.log(`Deleting associated ActivityRooms for room ID: ${roomId}`);
        await ActivityRoom.deleteMany({ roomId });      // Delete related activity rooms
        console.log('Associated ActivityRooms deleted successfully.');

        console.log(`Deleting associated Quizzes for room ID: ${roomId}`);
        await Quiz.deleteMany({ roomId });              // Delete related quizzes
        console.log('Associated Quizzes deleted successfully.');

        console.log(`Deleting associated Lessons for room ID: ${roomId}`);
        await Lesson.deleteMany({ roomId });            // Delete lessons (including PDFs/videos)
        console.log('Associated Lessons deleted successfully.');

        req.flash('success', 'Room and all related content deleted successfully.');
        res.redirect('/admin/Archive');
    } catch (err) {
        console.error('Error deleting room:', err);
        req.flash('error', 'Error deleting room.');
        res.redirect('/admin/Archive');
    }
});


//end of managing room--------------------------------------------------------------------------------















router.get('/dashboard/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user._id;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        console.log("Room ID:", roomId);

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

        console.log("Latest Completed PDF:", latestCompletedPdf);


        const lessonRooms = await LessonRoom.find({ roomId });
        if (!lessonRooms || lessonRooms.length === 0) {
            req.flash('error', 'No lesson rooms found for this room.');
            return res.render('admin/dashboard', { room, quizAnalytics: [], latestPdf: null, latestVideo: null, latestCompletedPdf: null });
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

        console.log("Latest PDF:", latestPdf);

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
        
        console.log("Latest Video:", latestVideo);


        const activityRooms = await ActivityRoom.find({ roomId });
        const activityRoomIds = activityRooms.map(ar => ar._id);

        const quizzes = await Quiz.find({ roomId: { $in: activityRoomIds } });

        const latestQuiz = quizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

        console.log("Latest Quiz:", latestQuiz);

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

        res.render('admin/dashboard', { room, quizAnalytics, latestPdf, latestVideo, latestCompletedPdf, latestQuiz });
        
    } catch (err) {
        console.error('Error accessing dashboard:', err);
        req.flash('error', 'Error accessing the dashboard.');
        res.redirect('/admin/homeAdmin');
    }
});



// Route to display all test results for a room
router.get('/dashboard/allTests/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Validate roomId to ensure it’s a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            req.flash('error', 'Invalid Room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch the room details
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch all quizzes related to the room's activity rooms
        const activityRooms = await ActivityRoom.find({ roomId });
        const activityRoomIds = activityRooms.map(ar => ar._id);

        const quizzes = await Quiz.find({ roomId: { $in: activityRoomIds } });
        
        // Prepare analytics for each quiz as done in the dashboard route
        const quizAnalytics = await Promise.all(
            quizzes.map(async (quiz) => {
                const results = await QuizResult.find({ quizId: quiz._id });

                if (results.length === 0) {
                    return { quizTitle: quiz.title, dataAvailable: false, _id: quiz._id };
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
                    _id: quiz._id
                };
            })
        );

        // Render all test results
        res.render('admin/allTests', { room, quizAnalytics });
    } catch (err) {
        console.error('Error accessing all tests:', err);
        req.flash('error', 'Error accessing all tests.');
        res.redirect('/admin/homeAdmin');
    }
});


// Route to display overall summary for a specific quiz
router.get('/overallSummary/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        // Fetch quiz and populate roomId for navigation
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const activityRoom = await ActivityRoom.findById(quiz.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch quiz results, populate user details, and sort by name
        const results = await QuizResult.find({ quizId })
            .populate('userId', 'first_name last_name')
            .sort({ 'userId.last_name': 1, 'userId.first_name': 1 })  // Sort by last name, then first name
            .lean();

        // Organize results by user and calculate attempt count for each result
        const resultData = await Promise.all(results.map(async (result) => {
            // Fetch all attempts for the user on this quiz, sorted by submission date
            const userAttempts = await QuizResult.find({ quizId, userId: result.userId._id })
                .sort({ submittedAt: 1 }) // Sort by oldest to newest
                .lean();

            // Determine the attempt number for this specific result
            const attemptNumber = userAttempts.findIndex(r => r._id.equals(result._id)) + 1;

            return {
                userId: result.userId._id,
                first_name: result.userId.first_name,
                last_name: result.userId.last_name,
                score: result.score,
                submittedAt: result.submittedAt,
                isLate: result.isLate,
                attempt: attemptNumber // Include attempt number in each result
            };
        }));

        // Sort resultData by last name, first name, and attempt
        resultData.sort((a, b) => {
            if (a.last_name === b.last_name) {
                if (a.first_name === b.first_name) {
                    return a.attempt - b.attempt; // Sort by attempt if names are identical
                }
                return a.first_name.localeCompare(b.first_name); // Sort by first name
            }
            return a.last_name.localeCompare(b.last_name); // Sort by last name
        });

        // Render the overallSummary view with the modified resultData
        res.render('admin/overallSummary', { quiz, resultData, roomId: activityRoom.roomId });
    } catch (err) {
        console.error('Error accessing overall summary:', err);
        req.flash('error', 'Error accessing overall summary.');
        res.redirect('/admin/homeAdmin');
    }
});


const ExcelJS = require('exceljs');
// Route to export overall summary to Excel
router.get('/overallSummary/:quizId/export', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        const quiz = await Quiz.findById(quizId);
        const results = await QuizResult.find({ quizId }).populate('userId', 'first_name last_name').lean();

        // Sort results by last name, first name, and attempt
        const sortedResults = await Promise.all(results.map(async (result) => {
            const userAttempts = await QuizResult.find({ quizId, userId: result.userId._id })
                .sort({ submittedAt: 1 }) // Sort by oldest to newest
                .lean();

            const attemptNumber = userAttempts.findIndex(r => r._id.equals(result._id)) + 1;

            return {
                user: `${result.userId.first_name} ${result.userId.last_name}`,
                score: `${result.score} / ${quiz.questions.length}`,
                submittedAt: new Date(result.submittedAt).toLocaleString(),
                isLate: result.isLate ? 'Yes' : 'No',
                attempt: attemptNumber
            };
        }));

        // Sort by user last name, first name, and attempt for Excel export
        sortedResults.sort((a, b) => {
            const [aFirst, aLast] = a.user.split(' ');
            const [bFirst, bLast] = b.user.split(' ');
            if (aLast === bLast) {
                if (aFirst === bFirst) {
                    return a.attempt - b.attempt;
                }
                return aFirst.localeCompare(bFirst);
            }
            return aLast.localeCompare(bLast);
        });

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Overall Summary');

        // Set worksheet columns
        worksheet.columns = [
            { header: 'User', key: 'user', width: 30 },
            { header: 'Score', key: 'score', width: 15 },
            { header: 'Attempt', key: 'attempt', width: 10 },
            { header: 'Submitted At', key: 'submittedAt', width: 20 },
            { header: 'Late Submission', key: 'isLate', width: 15 }
        ];

        // Add rows to the worksheet from sorted results
        sortedResults.forEach(result => worksheet.addRow(result));

        // Set response headers for download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename=Overall_Summary_${quiz.title}.xlsx`);

        // Send workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exporting to Excel:', err);
        req.flash('error', 'Failed to export data.');
        res.redirect(`/admin/overallSummary/${quizId}`);
    }
});


// Route to display individual test results for a specific user on a quiz
router.get('/testResult/:quizId/:userId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId, userId } = req.params;

    try {
        // Fetch quiz and user details
        const quiz = await Quiz.findById(quizId).lean();
        const user = await User.findById(userId).lean();
        if (!quiz || !user) {
            req.flash('error', 'Quiz or User not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch all quiz results for the specific user and quiz
        const quizResults = await QuizResult.find({ quizId, userId }).sort({ submittedAt: -1 }).lean();
        if (!quizResults.length) {
            req.flash('error', 'No test results found for this user.');
            return res.redirect(`/admin/overallSummary/${quizId}`);
        }

        // Render testResult.ejs with quiz, user, and all results
        res.render('admin/testResult', {
            quiz,
            user,
            quizResults, // Pass all quiz attempts
            totalScore: quiz.questions.length
        });
    } catch (err) {
        console.error('Error fetching test result:', err);
        req.flash('error', 'Error accessing test result.');
        res.redirect('/admin/homeAdmin');
    }
});



//end of dashboard----------------------------------------------------------------------------------------------------------------------------












// Route to handle lessons for a specific room
router.get('/lesson/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
    const { roomId } = req.params;
    console.log('Received roomId:', roomId);

    const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
    if (!roomObjectId) {
        console.error('Invalid roomId format');
        req.flash('error', 'Invalid room ID format.');
        return res.redirect('/admin/homeAdmin');
    }

    try {
        // Fetch room to ensure it exists
        const room = await Room.findById(roomObjectId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
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

        console.log('LessonRooms:', lessonRooms);
        console.log('Lessons found:', lessons);
        console.log('Videos found:', videos);

        // Render the lesson page with the data
        res.render('admin/lesson', {
            room,
            lessonRooms,
            lessons,
            videos,
            currentUser: req.user,
        });
    } catch (err) {
        console.error('Error accessing the room:', err);
        req.flash('error', 'Error accessing the room.');
        res.redirect('/admin/homeAdmin');
    }
});


// Route to create a lessonRoom for a specific room
router.post('/create-lesson-room/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
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
    const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;

    if (!roomObjectId) {
        console.error('Invalid roomId format in get-lessons');
        return res.status(400).send('Invalid roomId format');
    }

    try {
        // Check if roomId is a Room
        const room = await Room.findById(roomObjectId);
        if (room) {
            // Query LessonRooms for the Room
            const lessonRooms = await LessonRoom.find({ roomId: roomObjectId, archived: false });
            if (!lessonRooms || lessonRooms.length === 0) {
                console.warn('No LessonRooms found for the room.');
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

            console.log('Filtered PDFs:', pdfFiles);
            console.log('Filtered Videos:', videoFiles);

            return res.json({ pdfFiles, videoFiles });
        }

        // If roomId is not a Room, check if it's a LessonRoom
        const lessonRoom = await LessonRoom.findById(roomObjectId);
        if (!lessonRoom) {
            console.error('No Room or LessonRoom found for ID:', roomObjectId);
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

        console.log('Filtered PDFs for LessonRoom:', pdfFiles);
        console.log('Filtered Videos for LessonRoom:', videoFiles);

        res.json({ pdfFiles, videoFiles });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ message: 'Error fetching lessons' });
    }
});


initBuckets();

// Set up multer storage in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });



// Separate PDF upload route
router.post('/upload-pdf/:roomId', upload.single('pdfFile'), async (req, res) => {
    const { roomId } = req.params;
    const pdfBucket = getPdfBucket();
    const filename = `${roomId}-${req.file.originalname}`;

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect(`/admin/lesson/${roomId}`);
    }

    try {
        const uploadStream = pdfBucket.openUploadStream(filename);
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            const file = await pdfBucket.find({ filename }).toArray();
            if (file.length > 0) {
                await Lesson.findOneAndUpdate(
                    { roomId },
                    { $push: { pdfFiles: { pdfFileId: file[0]._id, pdfFileName: req.file.originalname } } },
                    { new: true, upsert: true }
                );
                req.flash('success', 'PDF uploaded successfully.');
            } else {
                req.flash('error', 'Error saving file reference.');
            }
            res.redirect(`/admin/lesson/${roomId}`);
        });
    } catch (error) {
        console.error('Error during PDF upload:', error);
        req.flash('error', 'Failed to upload PDF.');
        res.redirect(`/admin/lesson/${roomId}`);
    }
});

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
        console.error('Error retrieving file:', error);
        res.status(500).send('Error retrieving file.');
    }
});
// Separate Video upload route
router.post('/upload-video/:roomId', upload.single('videoFile'), async (req, res) => {
    const { roomId } = req.params;
    const videoBucket = getVideoBucket();
    const filename = `${roomId}-${req.file.originalname}`;

    if (!req.file) {
        req.flash('error', 'No video uploaded.');
        return res.status(400).json({ error: 'No video uploaded.' });
    }

    try {
        const videoUploadStream = videoBucket.openUploadStream(filename);
        videoUploadStream.end(req.file.buffer);

        videoUploadStream.on('finish', async () => {
            const video = await videoBucket.find({ filename }).toArray();
            if (video.length > 0) {
                await Video.findOneAndUpdate(
                    { roomId },
                    {
                        $push: {
                            videoFiles: {
                                videoFileId: video[0]._id,
                                videoFileName: req.file.originalname,
                                archived: false
                            }
                        }
                    },
                    { new: true, upsert: true }
                );
                req.flash('success', 'Video uploaded successfully.');
            } else {
                req.flash('error', 'Error saving video reference.');
            }
            res.status(200).json({ message: 'Video uploaded successfully.' });
        });
    } catch (error) {
        console.error('Error during video upload:', error);
        req.flash('error', 'Failed to upload video.');
        res.status(500).json({ error: 'Failed to upload video.' });
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
        console.error('Error retrieving video:', error);
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




router.get('/activities/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
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

        // Fetch all activity rooms (including archived) for the room
        const allActivityRooms = await ActivityRoom.find({ roomId: new mongoose.Types.ObjectId(roomId) });
        
        if (allActivityRooms.length === 0) {
            req.flash('error', 'No activity rooms found.');
            return res.redirect('/admin/homeAdmin');
        }

        
        // Filter non-archived activity rooms to display
        const activityRooms = allActivityRooms.filter(room => !room.archived);

        // Fetch quizzes related to non-archived activity rooms if needed
        const quizzes = await Quiz.find({ roomId: { $in: activityRooms.map(ar => ar._id) } });

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




// API route to fetch non-archived quizzes for a specific activity room
router.get('/activities/data/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    console.log('Fetching non-archived quizzes for room:', roomId); // Add logging

    try {
        // Fetch only quizzes associated with the roomId and where archived is false
        const quizzes = await Quiz.find({ 
            roomId: new mongoose.Types.ObjectId(roomId),
            archived: false // Only fetch quizzes that are not archived
        });

        if (!quizzes || quizzes.length === 0) {
            console.log('No non-archived quizzes found for room:', roomId);
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

        const newQuiz = new Quiz({
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
        const quiz = await Quiz.findById(id);
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

         // Reset quizStartTime if starting a new quiz or if it's missing
         if (!req.session.quizStartTime || req.session.currentQuizId !== id) {
            req.session.quizStartTime = Date.now();
            req.session.currentQuizId = id;  // Track current quiz ID to handle new quiz starts
        }
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
        const quiz = await Quiz.findById(quizId);
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

        // Clear quizStartTime and currentQuizId after submission
        delete req.session.quizStartTime;
        delete req.session.currentQuizId;

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
        const quiz = await Quiz.findById(quizId).lean();
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

// Route to archive a specific activity room
router.post('/archive-activity-room/:activityRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { activityRoomId } = req.params;

    try {
        await ActivityRoom.findByIdAndUpdate(activityRoomId, { archived: true });
        res.status(200).json({ message: 'Activity room archived successfully.' });
    } catch (error) {
        console.error('Error archiving activity room:', error);
        res.status(500).json({ error: 'Failed to archive activity room.' });
    }
});

// Route to unarchive a specific activity room
router.post('/unarchive-activity-room/:activityRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { activityRoomId } = req.params;

    try {
        await ActivityRoom.findByIdAndUpdate(activityRoomId, { archived: false });
        res.status(200).json({ message: 'Activity room unarchived successfully.' });
    } catch (error) {
        console.error('Error unarchiving activity room:', error);
        res.status(500).json({ error: 'Failed to unarchive activity room.' });
    }
});




// Ensure archived quizzes are fetched correctly in the activitiesArchive route
router.get('/activitiesArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    try {
        const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
        if (!roomObjectId) {
            req.flash('error', 'Invalid Room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        const archivedActivityRooms = await ActivityRoom.find({ roomId: roomObjectId, archived: true  });

        // Extract all lessonRoom IDs
        const activityRoomIds = archivedActivityRooms.map(room => room._id);

        const archivedQuizzes = await Quiz.find({ roomId: { $in: activityRoomIds }, archived: true });

         // Check if the client expects JSON
         if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ archivedActivityRooms, archivedQuizzes });
        }

        // Render the view with the archived data
        res.render('admin/activitiesArchive', { 
            archivedActivityRooms, 
            archivedQuizzes, 
            roomId 
        });
    } catch (error) {
        console.error('Error fetching archived activity rooms and quizzes:', error);
        req.flash('error', 'Failed to load archived activities.');
        res.redirect(`/admin/activities/${roomId}`);
    }
});






// Archive a specific quiz
router.post('/archive-quiz/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        const quiz = await Quiz.findByIdAndUpdate(
            quizId,
            { archived: true, archivedAt: new Date() }, // Set archived and archivedAt
            { new: true }
        );

        if (quiz) {
            console.log('Quiz archived:', quiz); // Verify the quiz was archived
            res.status(200).json({ message: 'Quiz archived successfully.' });
        } else {
            res.status(404).json({ message: 'Quiz not found.' });
        }
    } catch (error) {
        console.error('Error archiving quiz:', error);
        res.status(500).json({ message: 'Error archiving quiz.' });
    }
});

// Route to unarchive a quiz
router.post('/unarchive-quiz/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        // Validate quizId
        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({ error: 'Invalid quiz ID.' });
        }

        // Update the quiz's archived status
        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            { archived: false, archivedAt: null },
            { new: true } // Return the updated document
        );

        // Check if the quiz was found and updated
        if (!updatedQuiz) {
            return res.status(404).json({ error: 'Quiz not found.' });
        }

        // Send success response
        res.status(200).json({ message: 'Quiz unarchived successfully.', quiz: updatedQuiz });
    } catch (error) {
        console.error('Error unarchiving quiz:', error);
        res.status(500).json({ error: 'Failed to unarchive quiz.' });
    }
});

router.get('/quiz/modify/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }
        const activityRoom = await ActivityRoom.findById(quiz.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/homeAdmin');
        }
        res.render('quizzes/modify', { quiz });
    } catch (err) {
        console.error('Error fetching quiz for modification:', err);
        req.flash('error', 'Error fetching quiz for modification.');
        res.redirect('/admin/homeAdmin');
    }
});

router.post('/quiz/modify/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;
    const { title, questions } = req.body;
    try {

        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const activityRoom = await ActivityRoom.findById(quiz.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        if (!questions || questions.length === 0) {
            throw new Error('At least one question is required.');
        }

        // Validate and process questions
        questions.forEach((question, index) => {
            if (question.type === 'multiple-choice') {
                question.choices.forEach(choice => {
                    choice.isCorrect = !!choice.isCorrect; // Convert checkbox value to boolean
                });
            } else if (question.type === 'fill-in-the-blank') {
                if (!question.correctAnswer || question.correctAnswer.trim() === '') {
                    throw new Error(`Question ${index + 1} must have a correct answer.`);
                }
            }
        });

        // Update the quiz and get the updated document
        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            { title, questions },
            { new: true } // Return the updated document
        );

        if (!updatedQuiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Render the modified quiz details page
        res.render('quizzes/modify-result', { quiz: updatedQuiz, roomId: activityRoom.roomId  });
    } catch (err) {
        console.error('Error updating quiz:', err);
        req.flash('error', `Error updating quiz: ${err.message}`);
        res.redirect(`/admin/quiz/modify/${quizId}`);
    }
});

//end of  activities -------------------------------------------------------------------------------------------









router.get('/educGames/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
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