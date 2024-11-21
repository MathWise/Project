
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
        console.error(err);
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

        res.render('user/dashboard', { room, quizAnalytics, latestPdf, latestVideo, latestCompletedPdf, latestQuiz });
        
    } catch (err) {
        console.error('Error accessing dashboard:', err);
        req.flash('error', 'Error accessing the dashboard.');
        res.redirect('/user/homeUser');
    }
});


// Route to display all test results for a room
router.get('/dashboard/allTests/:roomId', ensureStudentLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Validate roomId to ensure it’s a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            req.flash('error', 'Invalid Room ID.');
            return res.redirect('/user/homeUser');
        }

        // Fetch the room details
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/user/homeUser');
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
        res.render('user/allTests', { room, quizAnalytics });
    } catch (err) {
        console.error('Error accessing all tests:', err);
        req.flash('error', 'Error accessing all tests.');
        res.redirect('/user/homeUser');
    }
});

module.exports = router;
