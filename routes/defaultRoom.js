//   /routes/admin.js
const multer = require('multer');

const express = require('express');
const mongoose = require('mongoose');
const Lesson = require('../models/lesson.js');
const Video = require('../models/video'); 
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getPdfBucket, getVideoBucket, initBuckets } = require('../config/gridFS');
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const middleware = require('../middleware');
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;

const Quiz = require('../models/QuizActivityRoom'); 
const ActivityRoom = require('../models/activityRoom'); 
const mime = require('mime-types');

// Handle room creation form submission
router.post('/homeAdmin', ensureAdminLoggedIn, async (req, res) => {
    const { name, gradeLevel, teacherName, email, roomPassword, lessons } = req.body;

    // Basic Validation for required fields
    if (!name || !gradeLevel || !teacherName || !email || !roomPassword) {
        req.flash('error', 'All fields are required to create a room.');
        return res.redirect('/admin/homeAdmin');
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
        req.flash('error', 'Invalid email address.');
        return res.redirect('/admin/homeAdmin');
    }

    // Validate selected lessons
    if (!Array.isArray(lessons) || lessons.length === 0) {
        req.flash('error', 'Please select at least one lesson.');
        return res.redirect('/admin/homeAdmin');
    }

    const session = await mongoose.startSession();
    const videoUploadTasks = [];
   
    try {
        session.startTransaction();
        // Step 1: Create a new Room
        const newRoom = new Room({ name, gradeLevel, teacherName, email, roomPassword });
        await newRoom.save({ session });
        console.log('New room created successfully:', newRoom);

        // Step 2: Create a default ActivityRoom for quizzes
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 1st-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await defaultActivityRoom.save({ session });
        console.log('Default ActivityRoom created successfully:', defaultActivityRoom);

        

          // Step 3: Process the selected lessons
          for (const lessonTitle of lessons) {
            const { lessonRoom, videoPath } = await processLessonRoom(newRoom, lessonTitle, session);

            if (videoPath) {
                videoUploadTasks.push({ newRoom, lessonRoom, videoPath });
            }
        }

        //start creating quiz=======================================================================================

        const quizzes = [
            {
                title: "Measures Time using 12-Hour and 24-Hour Clock - Easy",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                    {
                        questionText: "1.	What time is 3:00 p.m. in 24-hour format?",
                        type: "multiple-choice",
                        choices: [
                            { text: " A. 15:00 H", isCorrect: true },
                            { text: " B. 13:00 H", isCorrect: false },
                            { text: " C. 12:00 H", isCorrect: false },
                            { text: " D. 14:00 H", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	How many hours are there in one day? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 12", isCorrect: false  },
                            { text: "B. 24", isCorrect: true },
                            { text: "C. 36", isCorrect: false },
                            { text: "D. 48", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is 7:30 a.m. in 24-hour format?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 19:30 H", isCorrect: false  },
                            { text: "B. 07:30 H", isCorrect: true },
                            { text: "C. 17:30 H", isCorrect: false },
                            { text: "D. 12:30 H", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	What time is 10:15 p.m. in 24-hour format?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 22:15 H", isCorrect: true },
                            { text: "B. 21:15 H", isCorrect: false },
                            { text: "C. 23:15 H", isCorrect: false },
                            { text: "D. 20:15 H", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	How many minutes are there in 1 hour?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 30", isCorrect: false  },
                            { text: "B. 60", isCorrect: true },
                            { text: "C. 90", isCorrect: false },
                            { text: "D. 120", isCorrect: false }
                        ]
                    }                ],
                timer: 10, // Easy quiz timer (in minutes)
                maxAttempts: 3
            },

            {
                title: "Measures Time using 12-Hour and 24-Hour Clock - Hard",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is 2:45 p.m. in 24-hour format? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 14:45 H", isCorrect: true },
                            { text: "B. 15:45 H", isCorrect: false },
                            { text: "C. 16:45 H", isCorrect: false },
                            { text: "D. 12:45 H", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	If it is 18:30 H, what time is it in the 12-hour format?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 6:30 a.m", isCorrect: false },
                            { text: "B. 6:30 p.m.", isCorrect: true},
                            { text: "C. 5:30 p.m.", isCorrect: false },
                            { text: "D. 7:30 p.m.", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What time is 11:15 a.m. in 24-hour format?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 11:15 H", isCorrect: true },
                            { text: "B. 23:15 H", isCorrect: false },
                            { text: "C. 21:15 H", isCorrect: false },
                            { text: "D. 01:15 H", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	How many hours are there from 8:00 a.m. to 5:00 p.m.?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 8", isCorrect: false },
                            { text: "B. 9", isCorrect: true },
                            { text: "C. 10", isCorrect: false },
                            { text: "D. 11", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	What is 00:30 H in 12-hour format? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 12:30 a.m.", isCorrect:  false},
                            { text: "B. 12:30 p.m.", isCorrect: true },
                            { text: "C. 1:30 a.m.", isCorrect: false },
                            { text: "D. 1:30 p.m.", isCorrect: false }
                        ]
                    }
                ],
                timer: 15, // Hard quiz timer (in minutes)
                maxAttempts: 3
            }

            //start of 2nd quiz =========================================================================================================

        ];

        for (const quizData of quizzes) {
            const newQuiz = new Quiz(quizData);
            await newQuiz.save({ session });
            console.log(`Default Quiz - ${quizData.difficultyLevel} created successfully:`, newQuiz);
        }

        // Commit the transaction
        await session.commitTransaction();

         // Handle video uploads outside the transaction
         for (const task of videoUploadTasks) {
            try {
                await processLessonVideo(task.newRoom, task.lessonRoom, task.videoPath);
            } catch (videoErr) {
                console.error('Error processing video:', videoErr.message);
            }
        }

        req.flash('success', 'Room, default quizzes, and selected lessons created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error('Error creating room and associated resources:', err);

        // Check if the transaction is still active before aborting
        if (session.inTransaction()) {
            await session.abortTransaction();
            console.log('Transaction aborted.');
        }

    
        req.flash('error', 'Error creating room and associated resources. Please try again.');
        res.redirect('/admin/homeAdmin');
    } finally {
        session.endSession();
    }
});



// Supporting function to check if a file exists
function pathExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        console.error(`Error checking file path: ${filePath}`, err);
        return false;
    }
}
// Supporting function to process a LessonRoom
async function processLessonRoom(newRoom, lessonTitle, session) {
    const lessonData = getLessonData(lessonTitle);

    if (!lessonData) {
        throw new Error(`Lesson data not found for title: ${lessonTitle}`);
    }

    const lessonRoom = new LessonRoom({
        roomId: newRoom._id,
        subject: lessonData.subject,
        topic: lessonData.topic,
        archived: false,
    });
    await lessonRoom.save({ session });

    // Upload PDFs and associate them with a Lesson
    const pdfBucket = getPdfBucket();
    const pdfFiles = [];

    for (const pdf of lessonData.pdfPaths) {
        const pdfFile = await uploadPdfToGridFS(
            path.join(__dirname, pdf.path),
            pdf.filename,
            newRoom._id,
            lessonRoom._id,
            pdfBucket
        );
        pdfFiles.push({
            pdfFileId: pdfFile._id,
            pdfFileName: pdf.filename,
            archived: false,
        });
    }


    // Create or update the Lesson
    let lesson = await Lesson.findOne({ roomId: lessonRoom._id }).session(session);
    if (lesson) {
        lesson.pdfFiles.push(...pdfFiles);
        await lesson.save({ session });
    } else {
        lesson = new Lesson({
            roomId: lessonRoom._id,
            pdfFiles,
        });
        await lesson.save({ session });
    }

    console.log('Lesson created or updated successfully:', lesson);
    return { lessonRoom, videoPath: lessonData.videoPath };

}

// Function to retrieve lesson data based on the lesson title
function getLessonData(lessonTitle) {
    const lessons = {
        "Measures Time using 12-Hour and 24-Hour Clock": {
            subject: "Math-1st Quarter",
            topic: "Measures Time using 12-Hour and 24-Hour Clock",
            pdfPaths: [
                { path: '../public/defaults/Q1/Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf', filename: 'Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf' },
                { path: '../public/defaults/Q1/PPT Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf', filename: 'PPT Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q1/Measures Time using 12-Hour and 24-Hour Clock.mp4', filename: 'Measures Time using 12-Hour and 24-Hour Clock.mp4' }
        },
        "Multiplication of Simple Fractions": {
            subject: "Math-1st Quarter",
            topic: "Multiplication of Simple Fractions",
            pdfPaths: [
                { path: '../public/defaults/Q1/Multiplication of Fractions.pdf', filename: 'Multiplication of Fractions.pdf' },
                { path: '../public/defaults/Q1/PPT Multiplication of Fractions.pdf', filename: 'PPT Multiplication of Fractions.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q1/MULTIPLICATION OF SIMPLE FRACTIONS.mp4', filename: 'MULTIPLICATION OF SIMPLE FRACTIONS.mp4' }
        },
        "Dividing Decimals with Up to 2 Decimal Places": {
            subject: "Math-2nd Quarter",
            topic: "Dividing Decimals with Up to 2 Decimal Places",
            pdfPaths: [
                { path: '../public/defaults/Q2/MODULE Dividing Decimals with Up to 2 Decimal Places.pdf', filename: 'MODULE Dividing Decimals with Up to 2 Decimal Places.pdf' },
                { path: '../public/defaults/Q2/PPT Dividing Decimals with Up to 2 Decimal Places.pdf', filename: 'PPT Dividing Decimals with Up to 2 Decimal Places.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q2/Division of Decimals With Up to 2 Decimal Places.mp4', filename: 'Division of Decimals With Up to 2 Decimal Places.mp4' }
        },
        "Dividing Whole Numbers and Simple Fractions": {
            subject: "Math-2nd Quarter",
            topic: "Dividing Whole Numbers and Simple Fractions",
            pdfPaths: [
                { path: '../public/defaults/Q2/MODULE Dividing Whole Numbers and Simple Fractions.pdf', filename: 'MODULE Dividing Whole Numbers and Simple Fractions.pdf' },
                { path: '../public/defaults/Q2/PPT Dividing Whole Numbers and Simple Fractions.pdf', filename: 'PPT Dividing Whole Numbers and Simple Fractions.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q2/Dividing Simple Fraction, Whole Number by Fraction and Vice Versa.mp4', filename: 'Dividing Simple Fraction, Whole Number by Fraction and Vice Versa.mp4' }
        },
        "Multiplication of Decimals": {
            subject: "Math-3rd Quarter",
            topic: "Multiplication of Decimals",
            pdfPaths: [
                { path: '../public/defaults/Q3/MODULE Multiplying Decimals.pdf', filename: 'MODULE Multiplying Decimals.pdf' },
                { path: '../public/defaults/Q3/PPT Multiplying Decimals.pdf', filename: 'PPT Multiplying Decimals.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q3/MULTIPLICATION OF DECIMALS.mp4', filename: 'MULTIPLICATION OF DECIMALS.mp4' }
        },
        "Theoretical Probability": {
            subject: "Math-3rd Quarter",
            topic: "Theoretical Probability",
            pdfPaths: [
                { path: '../public/defaults/Q3/MODULE Theoretical Probability.pdf', filename: 'MODULE Theoretical Probability.pdf' },
                { path: '../public/defaults/Q3/PPT Theoretical Probability.pdf', filename: 'PPT Theoretical Probability.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q3/Probability of Simple Events.mp4', filename: 'Probability of Simple Events.mp4' }
        },
        "GMDAS": {
            subject: "Math-4th Quarter",
            topic: "GMDAS",
            pdfPaths: [
                { path: '../public/defaults/Q4/MODULE GMDAS.pdf', filename: 'MODULE GMDAS.pdf' },
                { path: '../public/defaults/Q4/PPT GMDAS.pdf', filename: 'PPT GMDAS.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q4/GMDAS.mp4', filename: 'GMDAS.mp4' }
        },
        "Visualizing and Describing Solid Figures": {
            subject: "Math-4th Quarter",
            topic: "Visualizing and Describing Solid Figures",
            pdfPaths: [
                { path: '../public/defaults/Q4/MODULE Visualizing and Describing Solid Figures.pdf', filename: 'MODULE Visualizing and Describing Solid Figures.pdf' },
                { path: '../public/defaults/Q4/PPT Visualizing and Describing Solid Figures.pdf', filename: 'PPT Visualizing and Describing Solid Figures.pdf' },
            ],
            videoPath: { path: '../public/defaults/Q4/Visualizing and Describing Solid Figures.mp4', filename: 'Visualizing and Describing Solid Figures.mp4' }
        },
    };

    return lessons[lessonTitle];
}

// Supporting function to upload PDFs
async function uploadPdfToGridFS(filePath, fileName, roomId, lessonRoomId, pdfBucket) {
    const pdfStream = fs.createReadStream(filePath);

    const pdfUpload = new Promise((resolve, reject) => {
        const uploadPdfStream = pdfBucket.openUploadStream(fileName, {
            metadata: { roomId, lessonRoomId },
        });

        pdfStream.pipe(uploadPdfStream)
            .on('finish', resolve)
            .on('error', reject);
    });

    await pdfUpload;

    const pdfFile = await pdfBucket.find({ filename: fileName }).toArray();
    if (!pdfFile.length) throw new Error(`PDF upload failed for file: ${fileName}`);

    console.log(`PDF uploaded successfully: ${pdfFile[0].filename}`);
    return pdfFile[0];
}

async function processLessonVideo(newRoom, lessonRoom, videoDetails) {
    try {
        const { path: videoFilePath, filename: videoFileName } = videoDetails;

        // Resolve the absolute path for the video file
        const resolvedVideoPath = path.resolve(__dirname, videoFilePath);

        // Validate video file path
        if (!pathExists(resolvedVideoPath)) {
            throw new Error(`Video file not found: ${resolvedVideoPath}`);
        }

        // Validate file type (must be MP4)
        if (mime.lookup(resolvedVideoPath) !== 'video/mp4') {
            throw new Error(`Invalid file type for video: ${videoFileName}`);
        }

        const videoBucket = getVideoBucket();
        const videoStream = fs.createReadStream(resolvedVideoPath);

        // Upload video to GridFS
        const videoUpload = new Promise((resolve, reject) => {
            const uploadVideoStream = videoBucket.openUploadStream(videoFileName, {
                metadata: { roomId: newRoom._id, lessonRoomId: lessonRoom._id },
            });

            videoStream.pipe(uploadVideoStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await videoUpload;

        // Fetch uploaded video file
        const videoFile = await videoBucket.find({ filename: videoFileName }).toArray();
        if (!videoFile.length) throw new Error(`Video upload failed for file: ${videoFileName}`);

        console.log('Video uploaded successfully:', videoFile[0]);

        // Create or update Video document
        let video = await Video.findOne({ roomId: lessonRoom._id });
        if (video) {
            video.videoFiles.push({
                videoFileId: videoFile[0]._id,
                videoFileName: videoFileName,
                archived: false,
            });
            await video.save();
        } else {
            video = new Video({
                roomId: lessonRoom._id,
                videoFiles: [
                    {
                        videoFileId: videoFile[0]._id,
                        videoFileName: videoFileName,
                        archived: false,
                    },
                ],
            });
            await video.save();
        }

        console.log('Video document created or updated successfully:', video);
    } catch (error) {
        console.error('Error processing video:', error.message);
    }
}
module.exports = router;