// for importing a default data

// Handle room creation form submission
router.post('/homeAdmin', ensureAdminLoggedIn, async (req, res) => {
    const { name, gradeLevel, teacherName, roomPassword } = req.body;

    try {
        // Step 1: Create a new Room
        const newRoom = new Room({ name, gradeLevel, teacherName, roomPassword });
        await newRoom.save();
        console.log('New room created successfully:', newRoom);

        //start=============================================================================================
        // Step 2: Create a default ActivityRoom for quizzes
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await defaultActivityRoom.save();
        console.log('Default ActivityRoom created successfully:', defaultActivityRoom);

         //Add default quizzes to ActivityRoom
         const defaultQuizzes = [
            {
                title: "Sample Quiz - Easy",
                roomId: defaultActivityRoom._id,
                difficultyLevel: "easy",
                questions: [
                    {
                        questionText: "What is 5 + 3?",
                        type: "fill-in-the-blank",
                        correctAnswer: "8",
                    },
                    {
                        questionText: "What is the color of the sky?",
                        type: "multiple-choice",
                        choices: [
                            { text: "Blue", isCorrect: true },
                            { text: "Green", isCorrect: false },
                            { text: "Yellow", isCorrect: false },
                            { text: "Red", isCorrect: false },
                        ],
                    },
                ],
                timer: 5, // Easy quiz timer (in minutes)
                maxAttempts: 3,
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
                            { text: "Hamburg", isCorrect: false },
                        ],
                    },
                    {
                        questionText: "Solve for x: 3x = 12",
                        type: "fill-in-the-blank",
                        correctAnswer: "4",
                    },
                ],
                timer: 10, // Medium quiz timer (in minutes)
                maxAttempts: 3,
            },
        ];

        for (const quizData of defaultQuizzes) {
            const quiz = new Quiz(quizData);
            await quiz.save();
            console.log(`Default Quiz - ${quizData.difficultyLevel} created successfully:`, quiz);
        }
        //end=========================================================================================================

        //start==============================================================================================
        // Create additional ActivityRoom and quizzes
        const additionalActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Additional Subject",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await additionalActivityRoom.save();
        console.log('Additional ActivityRoom created successfully:', additionalActivityRoom);

        const additionalQuizzes = [
            {
                title: "Sample Quiz - Advanced",
                roomId: additionalActivityRoom._id,
                difficultyLevel: "hard",
                questions: [
                    {
                        questionText: "What is the derivative of x^2?",
                        type: "fill-in-the-blank",
                        correctAnswer: "2x",
                    },
                    {
                        questionText: "Who developed the theory of relativity?",
                        type: "multiple-choice",
                        choices: [
                            { text: "Albert Einstein", isCorrect: true },
                            { text: "Isaac Newton", isCorrect: false },
                            { text: "Marie Curie", isCorrect: false },
                            { text: "Galileo Galilei", isCorrect: false },
                        ],
                    },
                ],
                timer: 15, // Hard quiz timer (in minutes)
                maxAttempts: 3,
            },
        ];

        for (const quizData of additionalQuizzes) {
            const quiz = new Quiz(quizData);
            await quiz.save();
            console.log(`Additional Quiz - ${quizData.difficultyLevel} created successfully:`, quiz);
        }
        //end=====================================================================================================

        // start=============================================================================================================
        // Step 3: Create a default LessonRoom
        const defaultLessonRoom = new LessonRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            topic: "Sample Topic",
            archived: false,
        });
        await defaultLessonRoom.save();
        console.log('Default LessonRoom created successfully:', defaultLessonRoom);

        // Step 4: Upload default PDF and create associated Lesson
        const pdfPath = path.join(__dirname, '../public/defaults/sample.pdf');
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

        // Step 5: Upload default video and create associated Video document
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

        const videoFile = await videoBucket.find({ filename: 'sampleVideo.mp4' }).toArray();
        if (!videoFile.length) throw new Error('Video upload failed');

        console.log('Default video uploaded successfully:', videoFile[0]);

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

        //end=======================================================================================================

        //start===========================================================================================================
        // Step 6: Add additional LessonRoom, PDF, and Video
        const additionalLessonRoom = new LessonRoom({
            roomId: newRoom._id,
            subject: "Additional Subject",
            topic: "Additional Topic",
            archived: false,
        });
        await additionalLessonRoom.save();
        console.log('Additional LessonRoom created successfully:', additionalLessonRoom);

        // Upload additional PDF
        const additionalPdfPath = path.join(__dirname, '../public/defaults/anotherSample.pdf');
        const additionalPdfBucket = getPdfBucket();
        const additionalPdfStream = fs.createReadStream(additionalPdfPath);

        const additionalPdfUpload = new Promise((resolve, reject) => {
            const uploadAdditionalPdfStream = additionalPdfBucket.openUploadStream('anotherSample.pdf', {
                metadata: { roomId: newRoom._id, lessonRoomId: additionalLessonRoom._id },
            });

            additionalPdfStream.pipe(uploadAdditionalPdfStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await additionalPdfUpload;

        const additionalPdfFile = await additionalPdfBucket.find({ filename: 'anotherSample.pdf' }).toArray();
        if (!additionalPdfFile.length) throw new Error('Additional PDF upload failed');

        console.log('Additional PDF uploaded successfully:', additionalPdfFile[0]);

        const additionalLesson = new Lesson({
            roomId: additionalLessonRoom._id,
            pdfFiles: [
                {
                    pdfFileId: additionalPdfFile[0]._id,
                    pdfFileName: 'anotherSample.pdf',
                    archived: false,
                },
            ],
        });

        await additionalLesson.save();
        console.log('Additional Lesson created successfully:', additionalLesson);

        // Upload additional video
        const additionalVideoPath = path.join(__dirname, '../public/defaults/anotherSampleVideo.mp4');
        const additionalVideoBucket = getVideoBucket();
        const additionalVideoStream = fs.createReadStream(additionalVideoPath);

        const additionalVideoUpload = new Promise((resolve, reject) => {
            const uploadAdditionalVideoStream = additionalVideoBucket.openUploadStream('anotherSampleVideo.mp4', {
                metadata: { roomId: newRoom._id, lessonRoomId: additionalLessonRoom._id },
            });

            additionalVideoStream.pipe(uploadAdditionalVideoStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        await additionalVideoUpload;

        const additionalVideoFile = await additionalVideoBucket.find({ filename: 'anotherSampleVideo.mp4' }).toArray();
        if (!additionalVideoFile.length) throw new Error('Additional video upload failed');

        console.log('Additional video uploaded successfully:', additionalVideoFile[0]);

        const additionalVideo = new Video({
            roomId: additionalLessonRoom._id,
            videoFiles: [
                {
                    videoFileId: additionalVideoFile[0]._id,
                    videoFileName: 'anotherSampleVideo.mp4',
                    archived: false,
                },
            ],
        });

        await additionalVideo.save();
        console.log('Additional Video created successfully:', additionalVideo);

        //end============================================================================================================================

        // Step 7: Flash success message and redirect
        req.flash('success', 'Room, lessons, and associated media created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (err) {
        console.error('Error creating room and associated resources:', err);
        req.flash('error', 'Error creating room and associated resources. Please try again.');
        res.redirect('/admin/homeAdmin');
    }
});














// Option 2

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { ensureAdminLoggedIn } = require('../middleware');
const Room = require('../models/Room');
const ActivityRoom = require('../models/ActivityRoom');
const LessonRoom = require('../models/LessonRoom');
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const Video = require('../models/Video');
const { getPdfBucket, getVideoBucket } = require('../utils/gridFsUtils');

// Configuration for default resources
const defaultQuizzes = [
    {
        title: "Sample Quiz - Easy",
        difficultyLevel: "easy",
        questions: [
            { questionText: "What is 5 + 3?", type: "fill-in-the-blank", correctAnswer: "8" },
            {
                questionText: "What is the color of the sky?",
                type: "multiple-choice",
                choices: [
                    { text: "Blue", isCorrect: true },
                    { text: "Green", isCorrect: false },
                    { text: "Yellow", isCorrect: false },
                    { text: "Red", isCorrect: false },
                ],
            },
        ],
        timer: 5,
        maxAttempts: 3,
    },
    {
        title: "Sample Quiz - Medium",
        difficultyLevel: "medium",
        questions: [
            {
                questionText: "What is the capital of Germany?",
                type: "multiple-choice",
                choices: [
                    { text: "Berlin", isCorrect: true },
                    { text: "Munich", isCorrect: false },
                    { text: "Frankfurt", isCorrect: false },
                    { text: "Hamburg", isCorrect: false },
                ],
            },
            { questionText: "Solve for x: 3x = 12", type: "fill-in-the-blank", correctAnswer: "4" },
        ],
        timer: 10,
        maxAttempts: 3,
    },
];

const additionalQuizzes = [
    {
        title: "Sample Quiz - Advanced",
        difficultyLevel: "hard",
        questions: [
            { questionText: "What is the derivative of x^2?", type: "fill-in-the-blank", correctAnswer: "2x" },
            {
                questionText: "Who developed the theory of relativity?",
                type: "multiple-choice",
                choices: [
                    { text: "Albert Einstein", isCorrect: true },
                    { text: "Isaac Newton", isCorrect: false },
                    { text: "Marie Curie", isCorrect: false },
                    { text: "Galileo Galilei", isCorrect: false },
                ],
            },
        ],
        timer: 15,
        maxAttempts: 3,
    },
];

const defaultFiles = {
    pdf: path.join(__dirname, '../public/defaults/sample.pdf'),
    video: path.join(__dirname, '../public/defaults/sampleVideo.mp4'),
};

const additionalFiles = {
    pdf: path.join(__dirname, '../public/defaults/anotherSample.pdf'),
    video: path.join(__dirname, '../public/defaults/anotherSampleVideo.mp4'),
};

// Helper to upload a file to GridFS
async function uploadFileToGridFS(filePath, bucket, metadata) {
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(path.basename(filePath), { metadata });
        stream.pipe(uploadStream)
            .on('finish', () => resolve(uploadStream.id))
            .on('error', reject);
    });
}

// Helper to create quizzes
async function createQuizzes(activityRoomId, quizzes) {
    for (const quiz of quizzes) {
        const newQuiz = new Quiz({ roomId: activityRoomId, ...quiz });
        await newQuiz.save();
        console.log(`Quiz created: ${newQuiz.title}`);
    }
}

// Helper to create LessonRoom and save PDFs
async function createLessonWithMedia(roomId, lessonRoomId, filePath, fileType) {
    const bucket = fileType === 'pdf' ? getPdfBucket() : getVideoBucket();
    const metadata = { roomId, lessonRoomId };

    const uploadedFileId = await uploadFileToGridFS(filePath, bucket, metadata);
    const uploadedFile = await bucket.find({ _id: uploadedFileId }).toArray();

    if (fileType === 'pdf') {
        const lesson = new Lesson({
            roomId: lessonRoomId,
            pdfFiles: [{
                pdfFileId: uploadedFile[0]._id,
                pdfFileName: uploadedFile[0].filename,
                archived: false,
            }],
        });
        await lesson.save();
        console.log(`Lesson created with PDF: ${uploadedFile[0].filename}`);
    } else if (fileType === 'video') {
        const video = new Video({
            roomId: lessonRoomId,
            videoFiles: [{
                videoFileId: uploadedFile[0]._id,
                videoFileName: uploadedFile[0].filename,
                archived: false,
            }],
        });
        await video.save();
        console.log(`Video created with file: ${uploadedFile[0].filename}`);
    }
}

// Main route for room creation
router.post('/homeAdmin', ensureAdminLoggedIn, async (req, res) => {
    const { name, gradeLevel, teacherName, roomPassword } = req.body;

    try {
        const newRoom = new Room({ name, gradeLevel, teacherName, roomPassword });
        await newRoom.save();
        console.log('Room created:', newRoom);

        // Create ActivityRooms and Quizzes
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await defaultActivityRoom.save();
        await createQuizzes(defaultActivityRoom._id, defaultQuizzes);

        const additionalActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Additional Subject",
            activityType: "Quiz",
            createdAt: new Date(),
        });
        await additionalActivityRoom.save();
        await createQuizzes(additionalActivityRoom._id, additionalQuizzes);

        // Create LessonRooms and associate media
        const defaultLessonRoom = new LessonRoom({
            roomId: newRoom._id,
            subject: "Default Subject",
            topic: "Sample Topic",
            archived: false,
        });
        await defaultLessonRoom.save();

        const additionalLessonRoom = new LessonRoom({
            roomId: newRoom._id,
            subject: "Additional Subject",
            topic: "Additional Topic",
            archived: false,
        });
        await additionalLessonRoom.save();

        await createLessonWithMedia(newRoom._id, defaultLessonRoom._id, defaultFiles.pdf, 'pdf');
        await createLessonWithMedia(newRoom._id, defaultLessonRoom._id, defaultFiles.video, 'video');

        await createLessonWithMedia(newRoom._id, additionalLessonRoom._id, additionalFiles.pdf, 'pdf');
        await createLessonWithMedia(newRoom._id, additionalLessonRoom._id, additionalFiles.video, 'video');

        req.flash('success', 'Room, quizzes, and lessons created successfully!');
        res.redirect('/admin/homeAdmin');
    } catch (error) {
        console.error('Error creating room:', error);
        req.flash('error', 'Error creating room. Please try again.');
        res.redirect('/admin/homeAdmin');
    }
});

module.exports = router;
