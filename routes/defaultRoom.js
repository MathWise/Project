//   /routes/admin.js
const multer = require('multer');
const express = require('express');
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



// Handle room creation form submission
router.post('/homeAdmin', ensureAdminLoggedIn, async (req, res) => {
    const { name, gradeLevel, teacherName, email, roomPassword } = req.body;

    try {
         // Validate the email format (basic validation)
         if (!/\S+@\S+\.\S+/.test(email)) {
            req.flash('error', 'Invalid email address.');
            return res.redirect('/admin/homeAdmin');
        }
        // Step 1: Create a new Room
        const newRoom = new Room({ name, gradeLevel, teacherName, email, roomPassword });
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
            subject: "Math-1st Quarter",
            topic: "Measures Time using 12-Hour and 24-Hour Clock",
            archived: false,
        });
        await defaultLessonRoom.save();
        console.log('Default LessonRoom created successfully:', defaultLessonRoom);

        // Step 4: Upload default PDF to GridFS
        const pdfPath = path.join(__dirname, '../public/defaults/Q1/Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf'); // Path to default PDF
        const pdfBucket = getPdfBucket();
        const pdfStream = fs.createReadStream(pdfPath);

        const pdfUpload = new Promise((resolve, reject) => {
            const uploadPdfStream = pdfBucket.openUploadStream('Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf', {
                metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom._id },
            });

            pdfStream.pipe(uploadPdfStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await pdfUpload;

        const pdfFile = await pdfBucket.find({ filename: 'Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf' }).toArray();
        if (!pdfFile.length) throw new Error('PDF upload failed');

        console.log('Default PDF uploaded successfully:', pdfFile[0]);

        // Step 5: Create a Lesson associated with the default LessonRoom
        const defaultLesson = new Lesson({
            roomId: defaultLessonRoom._id,
            pdfFiles: [
                {
                    pdfFileId: pdfFile[0]._id,
                    pdfFileName: 'Measuring-Time-12-Hour-and-24-Hour-Clocks.pdf',
                    archived: false,
                },
            ],
        });

        await defaultLesson.save();
        console.log('Default Lesson created successfully:', defaultLesson);

        // Step 6: Upload default video to GridFS
        const videoPath = path.join(__dirname, '../public/defaults/Q1/Measures Time using 12-Hour and 24-Hour Clock.mp4');
        const videoBucket = getVideoBucket();
        const videoStream = fs.createReadStream(videoPath);

        const videoUpload = new Promise((resolve, reject) => {
            const uploadVideoStream = videoBucket.openUploadStream('Measures Time using 12-Hour and 24-Hour Clock.mp4', {
                metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom._id },
            });

            videoStream.pipe(uploadVideoStream)
                .on('finish', resolve)
                .on('error', reject);
        });


        
        await videoUpload;

        // Fetch the uploaded video file from GridFS
        const videoFile = await videoBucket.find({ filename: 'Measures Time using 12-Hour and 24-Hour Clock.mp4' }).toArray();
        if (!videoFile.length) throw new Error('Video upload failed');

        console.log('Default video uploaded successfully:', videoFile[0]);

        // Step 7: Create a Video document for the LessonRoom
        const defaultVideo = new Video({
            roomId: defaultLessonRoom._id,
            videoFiles: [
                {
                    videoFileId: videoFile[0]._id,
                    videoFileName: 'Measures Time using 12-Hour and 24-Hour Clock.mp4',
                    archived: false,
                },
            ],
        });

        await defaultVideo.save();
        console.log('Default Video created successfully:', defaultVideo);

        //end of lesson room 1===========================================================================================================================================

        



              // Step 3: Create a default LessonRoom
              const defaultLessonRoom1 = new LessonRoom({
                roomId: newRoom._id,
                subject: "Math-1st Quarter",
                topic: "Multiplication of Simple Fractions",
                archived: false,
            });
            await defaultLessonRoom1.save();
            console.log('Default LessonRoom created successfully:', defaultLessonRoom1);
    
            // Step 4: Upload default PDF to GridFS
            const pdfPath1 = path.join(__dirname, '../public/defaults/Q1/Multiplication of Fractions.pdf'); // Path to default PDF
            const pdfBucket1 = getPdfBucket();
            const pdfStream1 = fs.createReadStream(pdfPath1);
    
            const pdfUpload1 = new Promise((resolve, reject) => {
                const uploadPdfStream1 = pdfBucket1.openUploadStream('Multiplication of Fractions.pdf', {
                    metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom1._id },
                });
    
                pdfStream1.pipe(uploadPdfStream1)
                    .on('finish', resolve)
                    .on('error', reject);
            });
    
            await pdfUpload1;
    
            const pdfFile1 = await pdfBucket1.find({ filename: 'Multiplication of Fractions.pdf' }).toArray();
            if (!pdfFile1.length) throw new Error('PDF upload failed');
    
            console.log('Default PDF uploaded successfully:', pdfFile1[0]);
    
            // Step 5: Create a Lesson associated with the default LessonRoom
            const defaultLesson1 = new Lesson({
                roomId: defaultLessonRoom1._id,
                pdfFiles: [
                    {
                        pdfFileId: pdfFile1[0]._id,
                        pdfFileName: 'Multiplication of Fractions.pdf',
                        archived: false,
                    },
                ],
            });
    
            await defaultLesson1.save();
            console.log('Default Lesson created successfully:', defaultLesson1);
    
            // Step 6: Upload default video to GridFS
            const videoPath1 = path.join(__dirname, '../public/defaults/Q1/MULTIPLICATION OF SIMPLE FRACTIONS.mp4');
            const videoBucket1 = getVideoBucket();
            const videoStream1 = fs.createReadStream(videoPath1);
    
            const videoUpload1 = new Promise((resolve, reject) => {
                const uploadVideoStream1 = videoBucket1.openUploadStream('MULTIPLICATION OF SIMPLE FRACTIONS.mp4', {
                    metadata: { roomId: newRoom._id, lessonRoomId: defaultLessonRoom1._id },
                });
    
                videoStream1.pipe(uploadVideoStream1)
                    .on('finish', resolve)
                    .on('error', reject);
            });
    
            await videoUpload1;
    
            // Fetch the uploaded video file from GridFS
            const videoFile1 = await videoBucket1.find({ filename: 'MULTIPLICATION OF SIMPLE FRACTIONS.mp4' }).toArray();
            if (!videoFile1.length) throw new Error('Video upload failed');
    
            console.log('Default video uploaded successfully:', videoFile1[0]);
    
            // Step 7: Create a Video document for the LessonRoom
            const defaultVideo1 = new Video({
                roomId: defaultLessonRoom1._id,
                videoFiles: [
                    {
                        videoFileId: videoFile1[0]._id,
                        videoFileName: 'MULTIPLICATION OF SIMPLE FRACTIONS.mp4',
                        archived: false,
                    },
                ],
            });
    
            await defaultVideo1.save();
            console.log('Default Video created successfully:', defaultVideo1);


        //end of lesson Room 2 ==========================================================================================================================================================





        // // Step 7: Define default quizzes by difficulty level
        // const quizzes = [
        //     {
        //         title: "Sample Quiz - Easy",
        //         roomId: defaultActivityRoom._id,
        //         difficultyLevel: "easy",
        //         questions: [
        //             {
        //                 questionText: "What is 5 + 3?",
        //                 type: "fill-in-the-blank",
        //                 correctAnswer: "8"
        //             },
        //             {
        //                 questionText: "What is the color of the sky?",
        //                 type: "multiple-choice",
        //                 choices: [
        //                     { text: "Blue", isCorrect: true },
        //                     { text: "Green", isCorrect: false },
        //                     { text: "Yellow", isCorrect: false },
        //                     { text: "Red", isCorrect: false }
        //                 ]
        //             }
        //         ],
        //         timer: 5, // Easy quiz timer (in minutes)
        //         maxAttempts: 3
        //     },
        //     {
        //         title: "Sample Quiz - Medium",
        //         roomId: defaultActivityRoom._id,
        //         difficultyLevel: "medium",
        //         questions: [
        //             {
        //                 questionText: "What is the capital of Germany?",
        //                 type: "multiple-choice",
        //                 choices: [
        //                     { text: "Berlin", isCorrect: true },
        //                     { text: "Munich", isCorrect: false },
        //                     { text: "Frankfurt", isCorrect: false },
        //                     { text: "Hamburg", isCorrect: false }
        //                 ]
        //             },
        //             {
        //                 questionText: "Solve for x: 3x = 12",
        //                 type: "fill-in-the-blank",
        //                 correctAnswer: "4"
        //             }
        //         ],
        //         timer: 10, // Medium quiz timer (in minutes)
        //         maxAttempts: 3
        //     },
        //     {
        //         title: "Sample Quiz - Hard",
        //         roomId: defaultActivityRoom._id,
        //         difficultyLevel: "hard",
        //         questions: [
        //             {
        //                 questionText: "What is the derivative of x^2?",
        //                 type: "fill-in-the-blank",
        //                 correctAnswer: "2x"
        //             },
        //             {
        //                 questionText: "Who developed the theory of relativity?",
        //                 type: "multiple-choice",
        //                 choices: [
        //                     { text: "Albert Einstein", isCorrect: true },
        //                     { text: "Isaac Newton", isCorrect: false },
        //                     { text: "Galileo Galilei", isCorrect: false },
        //                     { text: "Marie Curie", isCorrect: false }
        //                 ]
        //             }
        //         ],
        //         timer: 15, // Hard quiz timer (in minutes)
        //         maxAttempts: 3
        //     }
        // ];

       
        // for (const quizData of quizzes) {
        //     const newQuiz = new Quiz(quizData);
        //     await newQuiz.save();
        //     console.log(`Default Quiz - ${quizData.difficultyLevel} created successfully:`, newQuiz);
        // }

        // Step 8: Flash success message and redirect
        req.flash('success', 'Room, default quizzes, and default lesson room with media created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error('Error creating room and associated resources:', err);
        req.flash('error', 'Error creating room and associated resources. Please try again.');
        res.redirect('/admin/homeAdmin');
    }
});


module.exports = router;