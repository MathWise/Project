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
const { DateTime } = require('luxon');
const QuizActivity = require('../models/QuizActivityRoom'); // Correct model for quizzes
const ActivityRoom = require('../models/activityRoom'); // Correct model for activity rooms
const QuizResult = require('../models/QuizResult');
const PdfProgress = require('../models/PdfProgress');
const { ObjectId } = require('mongodb'); 

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

// end of home Admin-----------------------------------------------------------------------------------------------------------------





router.get('/dashboard/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
    const { roomId } = req.params;

    try {
        const room = await Room.findById(roomId);
        if (!room) {
            req.flash('error', 'Room not found.');
            return res.redirect('/admin/homeAdmin');
        }
        
        // Debugging: Print roomId format to verify compatibility
        console.log("Room ID type:", typeof roomId, "Room ID value:", roomId);

        // Fetch Lesson document by roomId as either ObjectId or string
        const lesson = await Lesson.findOne({
            $or: [
                { roomId: new ObjectId(roomId) },
                { roomId: roomId }
            ]
        });

        console.log("Lesson document found:", lesson); // Check if lesson document is found

        // Fetch the latest PDF if available
        const latestPdf = lesson && lesson.pdfFiles && lesson.pdfFiles.length > 0
            ? lesson.pdfFiles[lesson.pdfFiles.length - 1]
            : null;
        
         // Get the latest Video (if available)
         const latestVideo = lesson && lesson.videoFiles && lesson.videoFiles.length > 0
         ? lesson.videoFiles[lesson.videoFiles.length - 1]
         : null;

        
        const activityRooms = await ActivityRoom.find({ roomId });
        const activityRoomIds = activityRooms.map(ar => ar._id);
        
        const quizzes = await QuizActivity.find({ roomId: { $in: activityRoomIds } });

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
                    createdAt: quiz.createdAt  // Assuming `createdAt` is stored in the QuizActivity model
                };
            })
        );

        // Sort by creation date to have the latest quiz first
        quizAnalytics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Render the dashboard with only the sorted analytics
        res.render('admin/dashboard', { room, quizAnalytics, latestPdf, latestVideo });
        
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

        const quizzes = await QuizActivity.find({ roomId: { $in: activityRoomIds } });
        
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
        const quiz = await QuizActivity.findById(quizId);
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
        const quiz = await QuizActivity.findById(quizId).lean();
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

// Archive a room
// Archive a room with password verification
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

        // Update the room to mark it as archived
        await Room.findByIdAndUpdate(roomId, { isArchived: true });
        req.flash('success', 'Room archived successfully!');
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
        await Room.findByIdAndUpdate(roomId, { isArchived: false });
        req.flash('success', 'Room restored successfully!');
    } catch (err) {
        console.error('Error restoring room:', err);
        req.flash('error', 'Error restoring room.');
    }
    res.redirect('/admin/Archive');
});

// Render the archive page with archived rooms
router.get('/Archive', ensureLoggedIn, async (req, res) => {
    try {
        const rooms = await Room.find({ isArchived: true }); // Fetch only archived rooms
        res.render('admin/archive', {
            rooms,
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

// Route to handle lessons for a specific room
router.get('/lesson/:roomId', ensureAdminLoggedIn, middleware.ensureRoomAccess, async (req, res) => {
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
        const lessonRooms = await LessonRoom.find({ roomId, archived: false }); // Fetch lesson rooms associated with the room
        

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
                { roomId: new mongoose.Types.ObjectId(roomId) },  // Convert roomId to ObjectId
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

    console.log("Serving PDF with ID:", req.params.id); 
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


// Route to archive a specific lesson room
router.post('/archive-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { lessonRoomId } = req.params;

    try {
        await LessonRoom.findByIdAndUpdate(lessonRoomId, { archived: true }); // Update this if you want to remove instead
        res.status(200).json({ message: 'Lesson room archived successfully.' });
    } catch (error) {
        console.error('Error archiving lesson room:', error);
        res.status(500).json({ error: 'Failed to archive lesson room.' });
    }
});

// Route to unarchive a specific lesson room
router.post('/unarchive-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { lessonRoomId } = req.params;

    try {
        await LessonRoom.findByIdAndUpdate(lessonRoomId, { archived: false });
        res.status(200).json({ message: 'Lesson room unarchived successfully.' });
    } catch (error) {
        console.error('Error unarchiving lesson room:', error);
        res.status(500).json({ error: 'Failed to unarchive lesson room.' });
    }
});

// Route to display archived lesson rooms, passing roomId for "Go Back" link
router.get('/lessonArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    try {
        const archivedLessonRooms = await LessonRoom.find({ archived: true });
        res.render('admin/lessonArchive', { archivedLessonRooms, roomId });
    } catch (error) {
        console.error('Error fetching archived lesson rooms:', error);
        req.flash('error', 'Failed to load archived lessons.');
        res.redirect('/admin/homeAdmin');
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


// Route to display archived activity rooms
router.get('/activitiesArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;
    try {
        const archivedActivityRooms = await ActivityRoom.find({ roomId, archived: true });
        res.render('admin/activitiesArchive', { archivedActivityRooms, roomId });
    } catch (error) {
        console.error('Error fetching archived activity rooms:', error);
        req.flash('error', 'Failed to load archived activities.');
        res.redirect(`/admin/activities/${roomId}`);
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