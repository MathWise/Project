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
const { GridFsStorage } = require('multer-gridfs-storage');
const { getPdfBucket, getVideoBucket, initBuckets,  getSubmissionBucket} = require('../config/gridFS');
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const middleware = require('../middleware');
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;
const User = require('../models/user'); 
const connectDB = require('../config/dbConnection');
const mongoURI = process.env.MONGODB_URI;
const { DateTime } = require('luxon');
const Activity = require('../models/activityM.js');
const Quiz = require('../models/QuizActivityRoom'); 
const ActivityRoom = require('../models/activityRoom'); 
const QuizResult = require('../models/QuizResult');
const PdfProgress = require('../models/PdfProgress');
const { ObjectId } = require('mongodb'); 
const XLSX = require('xlsx');
const { archiveItem, cascadeArchive, cascadeUnarchive } = require('../utils/archiveHelper');


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
    const { search } = req.query; // Get the search query from the request
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

        res.render('admin/homeAdmin', {
            rooms,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error'),
            searchQuery: search || '' // Pass the search query to the view
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error fetching rooms.');
        res.redirect('/error'); // Redirect to error page if something goes wrong
    }
});



// end of home Admin-----------------------------------------------------------------------------------------------------------------













// Route to manage user access
router.get('/manage-access', ensureAdminLoggedIn, async (req, res) => {
    const { search } = req.query; // Get the search query from the request
    const successMessage = req.flash('success') || [];
    const errorMessage = req.flash('error') || [];
    try {
        let query = {};

        // If a search query exists, filter by name or email
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive regex
            query = {
                $or: [
                    { first_name: searchRegex },
                    { last_name: searchRegex },
                    { email: searchRegex }
                ]
            };
        }


        // Fetch filtered or all users
        const users = await User.find(query).sort({ role: 1 });

        res.render('admin/manageAccess', {
            users,
            successMessage,
            errorMessage,
            searchQuery: search || '' // Pass the search query to the view
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
router.get('/Archive', ensureAdminLoggedIn, async (req, res) => {
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

        // Fetch lesson rooms for the current room
        const lessonRooms = await LessonRoom.find({ roomId });
        if (!lessonRooms || lessonRooms.length === 0) {
            req.flash('error', 'No lesson rooms found for this room.');
            return res.render('admin/dashboard', { room, quizAnalytics: [], latestPdf: null, latestVideo: null, latestCompletedPdf: null });
        }

        const lessonRoomIds = lessonRooms.map(lr => lr._id);

        // Fetch the latest PDF completion progress
        const latestCompletedPdfProgress = await PdfProgress.findOne({
            userId,
            progress: 100,
            pdfFileId: {
                $in: (
                    await Lesson.find({ roomId: { $in: lessonRoomIds } })
                        .distinct('pdfFiles.pdfFileId')
                ),
            },
        }).sort({ updatedAt: -1 });

        let latestCompletedPdf = null;

        if (latestCompletedPdfProgress) {
            // Find the Lesson containing the completed PDF, restricted to lessons in this room
            const lesson = await Lesson.findOne({ 
                'pdfFiles.pdfFileId': latestCompletedPdfProgress.pdfFileId, 
                roomId: { $in: lessonRoomIds } 
            });

            if (lesson) {
                latestCompletedPdf = lesson.pdfFiles.find(
                    (pdf) => pdf.pdfFileId.toString() === latestCompletedPdfProgress.pdfFileId.toString()
                );
            }
        }

        console.log("Latest Completed PDF:", latestCompletedPdf);

        // Fetch lessons associated with lesson rooms
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



router.get('/quiz/:id', ensureAdminLoggedIn, (req, res) => {
    const { id } = req.params;
    res.redirect(`/admin/quizzes/start/${id}`);
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
                    _id: quiz._id,
                    createdAt: quiz.createdAt
                };
            })
        );
          // Sort the analytics data by date (latest first)
          quizAnalytics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

router.get('/responseFrequencies/:quizId/export', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        // Fetch quiz details and populate questions
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Check if questions exist in the quiz
        if (!quiz.questions || quiz.questions.length === 0) {
            req.flash('error', 'No questions found for this quiz.');
            return res.redirect(`/admin/overallSummary/${quizId}`);
        }

        const quizResults = await QuizResult.find({ quizId }).lean();
        if (!quizResults.length) {
            req.flash('error', 'No results found for this quiz.');
            return res.redirect(`/admin/responseFrequencies/${quizId}`);
        }

        // Map question details
        const questionDetails = quiz.questions.reduce((acc, question) => {
            if (question.type === 'multiple-choice') {
                // Extract correct answer(s) for multiple-choice questions
                const correctChoices = question.choices
                    .filter(choice => choice.isCorrect)
                    .map(choice => choice.text)
                    .join(', '); // Join multiple correct answers if applicable
                acc[question._id.toString()] = {
                    questionText: question.questionText || 'No question text available',
                    correctAnswer: correctChoices || 'N/A'
                };
            } else if (question.type === 'fill-in-the-blank') {
                // Use the `correctAnswer` field for fill-in-the-blank questions
                acc[question._id.toString()] = {
                    questionText: question.questionText || 'No question text available',
                    correctAnswer: question.correctAnswer || 'N/A'
                };
            }
            return acc;
        }, {});

        // Calculate frequency data
        const frequencyData = {};
        quizResults.forEach(result => {
            result.answers.forEach(answer => {
                const questionId = answer.questionId.toString();
                const userAnswer = answer.userAnswer;
                const isCorrect = answer.isCorrect;

                if (!frequencyData[questionId]) {
                    frequencyData[questionId] = {
                        questionText: questionDetails[questionId]?.questionText || 'No question text available',
                        correctAnswer: questionDetails[questionId]?.correctAnswer || 'N/A',
                        choices: {}, // Frequencies for A, B, C, D, etc.
                        correctTotal: 0, // Total correct responses
                        incorrectTotal: 0, // Total incorrect responses
                        total: 0 // Total responses
                    };
                }

                if (!frequencyData[questionId].choices[userAnswer]) {
                    frequencyData[questionId].choices[userAnswer] = 0;
                }

                frequencyData[questionId].choices[userAnswer]++;
                frequencyData[questionId].total++;

                if (isCorrect) {
                    frequencyData[questionId].correctTotal++;
                } else {
                    frequencyData[questionId].incorrectTotal++;
                }
            });
        });

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Response Frequencies');

        // Define headers
        const headers = [
            'Question',
            'A',
            'B',
            'C',
            'D',
            'Correct Answer',
            'Correct Responses',
            'Incorrect Responses',
            'Total Responses'
        ];
        worksheet.columns = headers.map(header => ({ header, key: header, width: 20 }));

        // Populate rows and highlight correct responses
        Object.keys(frequencyData).forEach(questionId => {
            const question = frequencyData[questionId];
            const row = worksheet.addRow({
                Question: question.questionText,
                'Correct Answer': question.correctAnswer,
                'Correct Responses': question.correctTotal,
                'Incorrect Responses': question.incorrectTotal,
                'Total Responses': question.total
            });

            // Map responses to columns A, B, C, D
            const choiceKeys = Object.keys(question.choices);
            const correctChoiceKey = choiceKeys.find(
                choice => choice === question.correctAnswer
            );

            ['A', 'B', 'C', 'D'].forEach((label, idx) => {
                const choiceText = choiceKeys[idx];
                const responseCount = choiceText ? question.choices[choiceText] || 0 : 0;

                // Add response count to the appropriate column
                row.getCell(label).value = responseCount;

                // Highlight the correct response if it matches
                if (choiceText === correctChoiceKey) {
                    row.getCell(label).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF00' } // Yellow highlight
                    };
                }
            });
        });

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Response_Frequencies_${quiz.title.replace(/\s+/g, '_')}.xlsx`
        );

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exporting response frequencies:', err);
        req.flash('error', 'Failed to export response frequencies.');
        res.redirect(`/admin/responseFrequencies/${quizId}`);
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


router.get('/responseFrequencies/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        // Fetch quiz details and populate questions
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        // Check if the quiz has questions
        if (!quiz.questions || quiz.questions.length === 0) {
            req.flash('error', 'No questions found for this quiz.');
            return res.redirect(`/admin/overallSummary/${quizId}`);
        }

        // Map question details (including correctAnswer for multiple-choice and fill-in-the-blank)
        const questionDetails = quiz.questions.reduce((acc, question) => {
            if (question.type === 'multiple-choice') {
                // For multiple-choice, find the correct choice(s)
                const correctChoices = question.choices
                    .filter(choice => choice.isCorrect)
                    .map(choice => choice.text)
                    .join(', '); // Join multiple correct answers if applicable
                acc[question._id.toString()] = {
                    questionText: question.questionText || 'No question text available',
                    correctAnswer: correctChoices || 'N/A'
                };
            } else if (question.type === 'fill-in-the-blank') {
                // For fill-in-the-blank, use the correctAnswer field
                acc[question._id.toString()] = {
                    questionText: question.questionText || 'No question text available',
                    correctAnswer: question.correctAnswer || 'N/A'
                };
            }
            return acc;
        }, {});

        console.log('Question Details:', questionDetails); // Debugging

        // Fetch all results for the quiz
        const quizResults = await QuizResult.find({ quizId }).lean();
        if (!quizResults.length) {
            req.flash('error', 'No results found for this quiz.');
            return res.redirect(`/admin/overallSummary/${quizId}`);
        }

        // Calculate frequency of responses for each question
        const frequencyData = {};
        quizResults.forEach(result => {
            result.answers.forEach(answer => {
                const questionId = answer.questionId.toString();
                const userAnswer = answer.userAnswer;

                if (!frequencyData[questionId]) {
                    frequencyData[questionId] = {
                        questionText: questionDetails[questionId]?.questionText || 'No question text available',
                        correctAnswer: questionDetails[questionId]?.correctAnswer || 'N/A',
                        choices: {}, // To store frequencies of each choice
                        total: 0 // To track the total answers for the question
                    };
                }

                if (!frequencyData[questionId].choices[userAnswer]) {
                    frequencyData[questionId].choices[userAnswer] = 0;
                }

                frequencyData[questionId].choices[userAnswer]++;
                frequencyData[questionId].total++; // Increment total for the question
            });
        });

        console.log('Frequency Data:', frequencyData); // Debugging

        // Render the frequency view
        res.render('admin/responseFrequencies', {
            quiz,
            frequencyData
        });

    } catch (err) {
        console.error('Error calculating response frequencies:', err);
        req.flash('error', 'Failed to calculate response frequencies.');
        res.redirect(`/admin/overallSummary/${quizId}`);
    }
});






// router.get('/responseFrequencies/:quizId/export', ensureAdminLoggedIn, async (req, res) => {
//     const { quizId } = req.params;

//     try {
//         const quiz = await Quiz.findById(quizId).lean();
//         if (!quiz) {
//             req.flash('error', 'Quiz not found.');
//             return res.redirect('/admin/homeAdmin');
//         }

//         const quizResults = await QuizResult.find({ quizId }).lean();
//         if (!quizResults.length) {
//             req.flash('error', 'No results found for this quiz.');
//             return res.redirect(`/admin/responseFrequencies/${quizId}`);
//         }

//         // Assign labels (A, B, C, D) to all unique answers for each question
//         const frequencyData = {};
//         quizResults.forEach(result => {
//             result.answers.forEach(answer => {
//                 const questionId = answer.questionId.toString();
//                 const userAnswer = answer.userAnswer;

//                 if (!frequencyData[questionId]) {
//                     frequencyData[questionId] = {
//                         questionText: answer.questionText,
//                         choices: {}, // Choice frequencies
//                         labels: {}, // Map of answers to labels (e.g., "Berlin" -> "A")
//                         total: 0
//                     };
//                 }

//                 // Assign a label to the answer if not already assigned
//                 if (!frequencyData[questionId].labels[userAnswer]) {
//                     const currentLabels = Object.values(frequencyData[questionId].labels);
//                     const nextLabel = String.fromCharCode(65 + currentLabels.length); // A, B, C, D
//                     frequencyData[questionId].labels[userAnswer] = nextLabel;
//                 }

//                 // Increment the frequency count for the answer
//                 const label = frequencyData[questionId].labels[userAnswer];
//                 if (!frequencyData[questionId].choices[label]) {
//                     frequencyData[questionId].choices[label] = 0;
//                 }

//                 frequencyData[questionId].choices[label]++;
//                 frequencyData[questionId].total++;
//             });
//         });

//         // Create a new workbook and worksheet
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Response Frequencies');

//         // Add headers
//         const headers = ['Question', 'A', 'B', 'C', 'D', 'Total Responses'];
//         worksheet.columns = headers.map(header => ({ header, key: header, width: 20 }));

//         // Populate rows
//         Object.keys(frequencyData).forEach(questionId => {
//             const question = frequencyData[questionId];
//             const row = { Question: question.questionText, 'Total Responses': question.total };

//             // Fill frequencies for A, B, C, D
//             ['A', 'B', 'C', 'D'].forEach(label => {
//                 row[label] = question.choices[label] || 0; // Default to 0 if no responses for this choice
//             });

//             worksheet.addRow(row);
//         });

//         // Set response headers for file download
//         res.setHeader(
//             'Content-Type',
//             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//         );
//         res.setHeader(
//             'Content-Disposition',
//             `attachment; filename=Response_Frequencies_${quiz.title.replace(/\s+/g, '_')}.xlsx`
//         );

//         // Write workbook to response
//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (err) {
//         console.error('Error exporting response frequencies:', err);
//         req.flash('error', 'Failed to export response frequencies.');
//         res.redirect(`/admin/responseFrequencies/${quizId}`);
//     }
// });


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
    console.log(`Creating ${activityType} room for roomId: ${roomId}`);

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


        // Get IDs of all non-archived activity rooms
        const activityRoomIds = activityRooms.map(ar => ar._id);
        // Fetch quizzes and activities related to the activity rooms

        // Modify quiz query based on user role
        const quizQuery = { roomId: { $in: activityRoomIds }, archived: false };
        if (req.user.role !== 'admin') {
            quizQuery.isDraft = false; // Exclude drafts for non-admins
        }
        const [quizzes, activities] = await Promise.all([
            Quiz.find({ roomId: { $in: activityRoomIds }, archived: false }),
            Activity.find({ roomId: { $in: activityRoomIds }, archived: false }),
        ]);

        res.render('admin/activities', {
            room,
            activityRooms,
            quizzes: quizzes || [],
            activities: activities || []
        });
    } catch (err) {
        console.error('Error accessing activities:', err);
        req.flash('error', 'Error accessing activities.');
        res.redirect('/admin/homeAdmin');
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


router.post('/quiz/import', ensureAdminLoggedIn, upload.single('file'), async (req, res) => {
    try {
        console.log('Import quiz endpoint hit');

        if (!req.file) {
            console.error('No file uploaded.');
            return res.status(400).json({ message: 'No file uploaded. Please select a valid Excel file.' });
        }

        if (!req.body.activityRoomId) {
            console.error('Missing activityRoomId.');
            return res.status(400).json({ message: 'Activity Room ID is required.' });
        }

        const activityRoomId = Array.isArray(req.body.activityRoomId)
            ? req.body.activityRoomId[0]
            : req.body.activityRoomId;

        if (!mongoose.Types.ObjectId.isValid(activityRoomId)) {
            console.error('Invalid Activity Room ID:', activityRoomId);
            return res.status(400).json({ message: 'Invalid Activity Room ID.' });
        }

        console.log('Activity Room ID received:', activityRoomId);

        const fileBuffer = req.file.buffer;
        console.log('File uploaded successfully. Parsing Excel file...');

        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error('No sheet found in the Excel file.');

        const data = XLSX.utils.sheet_to_json(sheet);
        console.log('Parsed data from Excel:', data);

        const quizQuestions = [];
        let quizTimer = 5;
        let quizMaxAttempts = 3;
        let quizDeadline = null;

        // Parse metadata and questions
        data.forEach((row, index) => {
            if (index === 0) {
                // Parse metadata
                quizTimer = parseInt(row['Timer'], 10) || quizTimer;
                quizMaxAttempts = parseInt(row['Max Attempts'], 10) || quizMaxAttempts;

                if (row['Deadline']) {
                    const parsedDeadline = DateTime.fromFormat(row['Deadline'], 'MM/dd/yy, h:mm a', { zone: 'Asia/Manila' });
                    if (parsedDeadline.isValid) {
                        quizDeadline = parsedDeadline.toUTC().toJSDate();
                    } else {
                        console.warn(`Invalid deadline format: ${row['Deadline']}. Skipping deadline.`);
                    }
                }
                return;
            }

            // Validate required fields
            if (!row['Question Text'] || !row['Type']) {
                console.warn(`Skipping row ${index + 1}: Missing required fields (Question Text or Type).`);
                return;
            }

            const question = {
                questionText: row['Question Text'],
                type: row['Type'].toLowerCase(),
                choices: [],
                correctAnswer: row['Correct Answer'] ? row['Correct Answer'].toString().trim() : ''
            };

            if (question.type === 'multiple-choice') {
                if (!row['Choices']) {
                    console.warn(`Skipping row ${index + 1}: Missing choices for multiple-choice question.`);
                    return;
                }

                // Parse choices and validate correct answer
                const choices = row['Choices'].split(',').map(choice => choice.trim());
                question.choices = choices.map(choice => ({
                    text: choice,
                    isCorrect: choice === question.correctAnswer
                }));

                // Ensure correct answer is in choices
                if (!choices.includes(question.correctAnswer)) {
                    console.warn(
                        `Skipping row ${index + 1}: Correct Answer "${question.correctAnswer}" not found in Choices [${choices.join(', ')}].`
                    );
                    return;
                }
            } else if (question.type === 'fill-in-the-blank') {
                if (!question.correctAnswer) {
                    console.warn(`Skipping row ${index + 1}: Fill-in-the-blank question must have a correct answer.`);
                    return;
                }
            } else {
                console.warn(`Skipping row ${index + 1}: Unsupported question type "${row['Type']}".`);
                return;
            }

            quizQuestions.push(question);
        });

        console.log('Constructed quiz questions:', quizQuestions);

        // Save the quiz
        const newQuiz = new Quiz({
            title: 'Imported Quiz',
            roomId: new mongoose.Types.ObjectId(activityRoomId),
            timer: quizTimer,
            maxAttempts: quizMaxAttempts,
            deadline: quizDeadline,
            questions: quizQuestions,
            isDraft: true
        });

        await newQuiz.save();
        console.log('Quiz saved successfully:', newQuiz);
        res.json({ message: 'Quiz imported successfully!', quizId: newQuiz._id });
    } catch (error) {
        console.error('Error importing quiz:', error);
        res.status(500).json({ message: 'Failed to import quiz.', error: error.message });
    }
});

//example
// Route to submit a new quiz
router.post('/quiz/create', ensureAdminLoggedIn, async (req, res) => {

    const { activityRoomId, title, questions, timer, deadline, maxAttempts = 5 ,isDraft} = req.body;
    console.log('Creating quiz with received deadline:', deadline);  // Log the received deadline
    if (!mongoose.Types.ObjectId.isValid(activityRoomId)) {
        console.error('Invalid activityRoomId:', activityRoomId);
        req.flash('error', 'Invalid activity room ID.');
        return res.redirect('/admin/activities');
    }

    try {

        if (!Array.isArray(questions) || questions.length === 0) {
            req.flash('error', 'At least one question is required.');
            return res.redirect(`/admin/activities/${activityRoomId}`);
        }
        // Validate timer
        if (!timer || isNaN(timer)) {
            req.flash('error', 'Timer is required and must be a valid number.');
            return res.redirect(`/admin/activities/${activityRoomId}`);
        }

        const activityRoom = await ActivityRoom.findById(activityRoomId);
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/activities');
        }

         // Validate and process questions
         questions.forEach((question, qIndex) => {
            if (!question.type) {
                throw new Error(`Question ${qIndex + 1} must have a valid type.`);
            }

            if (question.type === 'multiple-choice') {
                if (!Array.isArray(question.choices) || question.choices.length === 0) {
                    throw new Error(`Multiple-choice question ${qIndex + 1} must have at least one choice.`);
                }

                question.choices.forEach((choice, cIndex) => {
                    if (!choice.text || choice.text.trim() === '') {
                        throw new Error(`Choice ${cIndex + 1} for question ${qIndex + 1} must have text.`);
                    }
                    choice.isCorrect = !!choice.isCorrect; // Convert to boolean
                });

                // Ensure at least one choice is marked correct
                if (!question.choices.some(choice => choice.isCorrect)) {
                    throw new Error(`Multiple-choice question ${qIndex + 1} must have at least one correct choice.`);
                }
            } else if (question.type === 'fill-in-the-blank') {
                if (!question.correctAnswer || question.correctAnswer.trim() === '') {
                    throw new Error(`Fill-in-the-blank question ${qIndex + 1} must have a correct answer.`);
                }
            } else {
                throw new Error(`Unknown question type for question ${qIndex + 1}: ${question.type}`);
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
            maxAttempts: parseInt(maxAttempts, 10),
            isDraft: isDraft === 'true',
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


//public or private
router.post('/quiz/publish/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        const quiz = await Quiz.findByIdAndUpdate(
            quizId,
            { isDraft: false }, // Update the draft status
            { new: true } // Return the updated document
        );

        if (!quiz) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/activities');
        }

        req.flash('success', 'Quiz successfully published and is now visible to students.');
        res.redirect(`/admin/activities/${quiz.roomId}`);
    } catch (err) {
        console.error('Error publishing quiz:', err);
        req.flash('error', 'Failed to publish quiz.');
        res.redirect('/admin/activities');
    }
});


// Toggle draft status of a quiz
router.post('/quiz/toggle-draft/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Toggle the draft status using the schema method
        await quiz.toggleDraft();

        const status = quiz.isDraft ? 'private' : 'public';
        res.status(200).json({ message: `Quiz is now ${status}.` });
    } catch (error) {
        console.error('Error toggling draft status:', error);
        res.status(500).json({ message: 'Failed to toggle draft status.' });
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

        // Always reset quizStartTime and currentQuizId for a new attempt
        req.session.quizStartTime = Date.now();
        req.session.currentQuizId = id;

        
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




router.get('/activitiesArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    try {
        const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : roomId;

        // Fetch all activity rooms for the specified roomId
        const allActivityRooms = await ActivityRoom.find({
            roomId: { $in: [roomObjectId, roomObjectId.toString()] } // Match ObjectId and string
        });

        // Filter archived activity rooms
        const archivedActivityRooms = allActivityRooms.filter(room => room.archived === true);

        // Get IDs for all activity rooms (archived and non-archived)
        const allActivityRoomIds = allActivityRooms.map(room => room._id);

        // Fetch archived quizzes and activities regardless of room's archive status
        const archivedQuizzes = await Quiz.find({
            roomId: { $in: allActivityRoomIds }, // Include all room IDs
            archived: true
        });

        const archivedActivities = await Activity.find({
            roomId: { $in: allActivityRoomIds }, // Include all room IDs
            archived: true
        });

        console.log('All Activity Rooms:', allActivityRooms);
        console.log('Archived Activity Rooms:', archivedActivityRooms);
        console.log('Archived Quizzes:', archivedQuizzes);
        console.log('Archived Activities:', archivedActivities);

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ archivedActivityRooms, archivedQuizzes, archivedActivities });
        }

        res.render('admin/activitiesArchive', { 
            archivedActivityRooms, 
            archivedQuizzes, 
            archivedActivities,
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




//activty-----------------------------------------------------------------------------------------------------------------------------------------

















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