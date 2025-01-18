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

    if (!name || !gradeLevel || !teacherName || !email || !roomPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required to create a room.' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    if (!Array.isArray(lessons) || lessons.length === 0) {
        return res.status(400).json({ success: false, message: 'Please select at least one lesson.' });
    }

    const session = await mongoose.startSession();
    const videoUploadTasks = [];
   
    try {
        session.startTransaction();
        // Step 1: Create a new Room
        const newRoom = new Room({ name, gradeLevel, teacherName, email, roomPassword });
        await newRoom.save({ session });
        console.log('New room created successfully:', newRoom);

        //start of creating room for quiz==================================================================================================================

        // Step 2: Create a default ActivityRoom for quizzes
        const defaultActivityRoom = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 1st-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom.save({ session });
        console.log('Default ActivityRoom created successfully:', defaultActivityRoom);

        //start of creating room1 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom1 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 1st-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom1.save({ session });
        console.log('Default ActivityRoom1 created successfully:', defaultActivityRoom1);


        //start of creating room2 for quiz==================================================================================================================

            // Step 2: Create a default ActivityRoom for quizzes
            const defaultActivityRoom2 = new ActivityRoom({
                roomId: newRoom._id,
                subject: "Math 2nd-Quarter",
                activityType: "Quiz",
                createdAt: new Date(),
                archived: false
            });
            await defaultActivityRoom2.save({ session });
            console.log('Default ActivityRoom2 created successfully:', defaultActivityRoom2);

        //start of creating room3 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom3 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 2nd-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom3.save({ session });
        console.log('Default ActivityRoom3 created successfully:', defaultActivityRoom3);

        //start of creating room 4 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom4 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 3rd-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom4.save({ session });
        console.log('Default ActivityRoom4 created successfully:', defaultActivityRoom4);

        //start of creating room 5 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom5 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 3rd-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom5.save({ session });
        console.log('Default ActivityRoom5 created successfully:', defaultActivityRoom5);

          //start of creating room 6 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom6 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 4th-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom6.save({ session });
        console.log('Default ActivityRoom6  created successfully:', defaultActivityRoom6);

            //start of creating room 6 for quiz==================================================================================================================

          // Step 2: Create a default ActivityRoom for quizzes
          const defaultActivityRoom7 = new ActivityRoom({
            roomId: newRoom._id,
            subject: "Math 4th-Quarter",
            activityType: "Quiz",
            createdAt: new Date(),
            archived: false
        });
        await defaultActivityRoom7.save({ session });
        console.log('Default ActivityRoom7 created successfully:', defaultActivityRoom7);


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
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

            //start of 1st quiz =========================================================================================================


            {
                title: "MULTIPLICATION OF FRACTIONS - Easy",
                roomId: defaultActivityRoom1._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                    {
                        questionText: "1.	what is 1/2 x 1/4? ",
                        type: "multiple-choice",
                        choices: [
                            { text: " A. 1/8", isCorrect: true },
                            { text: " B. 1/6", isCorrect: false },
                            { text: " C. 1/2", isCorrect: false },
                            { text: " D. 1/3", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	If you multiply 3/5 by 2, what is the product? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 6/5", isCorrect: true },
                            { text: "B. 3/10", isCorrect: false },
                            { text: "C. 3/5", isCorrect: false },
                            { text: "D. 5/3", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is 2/3 x 1/2?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/6", isCorrect: false  },
                            { text: "B. 1/3", isCorrect: true },
                            { text: "C. 2/6", isCorrect: false },
                            { text: "D. 2/5", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	What is 4/5 x 1/5?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 4/25", isCorrect: true },
                            { text: "B. 1/5", isCorrect: false },
                            { text: "C. 1/4", isCorrect: false },
                            { text: "D. 5/4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	what is 1/3 x 3/4?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/4", isCorrect: false  },
                            { text: "B. 1/2", isCorrect: true },
                            { text: "C. 3/12", isCorrect: false },
                            { text: "D. 1/3", isCorrect: false }
                        ]
                    }                ],
                timer: 10, // Easy quiz timer (in minutes)
                maxAttempts: 3
            },

            {
                title: "MULTIPLICATION OF FRACTIONS - Hard",
                roomId: defaultActivityRoom1._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	what is 5/6 x 3/8? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 15/48", isCorrect: true },
                            { text: "B. 5/16", isCorrect: false },
                            { text: "C. 15/24", isCorrect: false },
                            { text: "D. 5/8", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	if 3/4 of a number is 12, what is 3/4 x 16?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 9", isCorrect: false },
                            { text: "B. 12", isCorrect: true},
                            { text: "C. 15", isCorrect: false },
                            { text: "D. 18", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	what is 7/10 x 2/3?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 14/30", isCorrect: true },
                            { text: "B. 7/15", isCorrect: false },
                            { text: "C. 14/10", isCorrect: false },
                            { text: "D. 7/20", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	calculate 9/10 x 5/6.",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 45/60", isCorrect: false },
                            { text: "B. 3/4", isCorrect: true },
                            { text: "C. 15/20", isCorrect: false },
                            { text: "D. 75/60", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	what is 4/9 x 3/5 ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 12/45", isCorrect:  true},
                            { text: "B. 12/15", isCorrect: false },
                            { text: "C. 7/15", isCorrect: false },
                            { text: "D. 1/3", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

            //start of 2nd quiz===========================================================================================================
            {
                title: "Dividing Decimals with Up to 2 Decimal Places - Easy",
                roomId: defaultActivityRoom2._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                    {
                        questionText: "1.	What is 6.4 ÷ 2?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A) 2.2", isCorrect: false },
                            { text: "B) 3.2", isCorrect: true },
                            { text: "C) 4.2", isCorrect: false },
                            { text: "D) 5.2", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2. If you divide 9.0 by 3, what is the result? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A) 2.0", isCorrect: false  },
                            { text: "B) 3.0", isCorrect: true },
                            { text: "C) 4.0", isCorrect: false },
                            { text: "D) 5.0", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is 5.5 ÷ 1.1?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A) 4.0", isCorrect: false  },
                            { text: "B) 5.0", isCorrect: true },
                            { text: "C) 5.5", isCorrect: false },
                            { text: "D) 6.0", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	How much is 8.8 ÷ 4? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A) 1.8", isCorrect: false },
                            { text: "B) 2.0", isCorrect: false },
                            { text: "C) 2.2", isCorrect: true },
                            { text: "D) 2.4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "What is the quotient of 7.2 and 2.4?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A) 2.0", isCorrect: false  },
                            { text: "B) 2.5", isCorrect: false },
                            { text: "C) 3.0", isCorrect: true },
                            { text: "D) 3.5", isCorrect: false }
                        ]
                    }                ],
                timer: 10, // Easy quiz timer (in minutes)
                maxAttempts: 3
            },

            {
                title: " Dividing Decimals with Up to 2 Decimal Places- Hard",
                roomId: defaultActivityRoom2._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is 15.75 ÷ 0.25? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 60", isCorrect: true },
                            { text: "B. 62", isCorrect: false },
                            { text: "C. 64", isCorrect: false },
                            { text: "D. 66", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	If a car travels 123.45 miles in 2.5 hours, what is its average speed?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 48.5 mph", isCorrect: true },
                            { text: "B. 49.5 mph", isCorrect: false},
                            { text: "C. 50.5 mph", isCorrect: false },
                            { text: "D. 51.5 mph", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.   Calculate 9.6 ÷ 0.8.?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 11", isCorrect: false },
                            { text: "B. 12", isCorrect: true },
                            { text: "C. 13", isCorrect: false },
                            { text: "D. 14", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	What is the result of 45.6 ÷ 1.2?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 36", isCorrect: true },
                            { text: "B. 37", isCorrect:  false},
                            { text: "C. 38", isCorrect: false },
                            { text: "D. 39", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	 How much is 100.0 ÷ 4.0?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 24", isCorrect:  false},
                            { text: "B. 25", isCorrect: true },
                            { text: "C. 26", isCorrect: false },
                            { text: "D. 27", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },
               //start of 3rd quiz===========================================================================================================

               {
                title: "Dividing Whole Numbers and Simple Fractions - easy",
                roomId: defaultActivityRoom3._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	what is the quotient of 10 divided by 2? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 2", isCorrect: false },
                            { text: "B. 5", isCorrect: true },
                            { text: "C. 10", isCorrect: false },
                            { text: "D. 20", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	12 divided by 3 ?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 3", isCorrect: false },
                            { text: "B. 4", isCorrect: true},
                            { text: "C. 6", isCorrect: false },
                            { text: "D. 5", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	what is 1 divided by 1/2?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1", isCorrect: false },
                            { text: "B. 4", isCorrect: true },
                            { text: "C. 6", isCorrect: false },
                            { text: "D. 5", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	find the quotient of 8 divided by 4?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1", isCorrect:  false},
                            { text: "B. 2", isCorrect: true },
                            { text: "C. 3", isCorrect: false },
                            { text: "D. 4", isCorrect: false }
                        ]
                    },
                 
                    {
                        questionText: "5.	 what is the result of 6 divided by 3/4",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 4", isCorrect:  false},
                            { text: "B. 8", isCorrect: true },
                            { text: "C. 2", isCorrect: false },
                            { text: "D. 1.5", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },
            {
                title: " Dividing Whole Numbers and Simple Fractions- Hard",
                roomId: defaultActivityRoom3._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	what is the quotient of 3/4 divided by 1/2? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 3/2", isCorrect: true },
                            { text: "B. 3/8", isCorrect: false },
                            { text: "C. 1/2", isCorrect: false },
                            { text: "D. 3/4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	15 divided by 3/5?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 10", isCorrect: true },
                            { text: "B. 12", isCorrect: false},
                            { text: "C. 9", isCorrect: false },
                            { text: "D. 8", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	what is the result of 5/6 divided by 2/3?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 5/4", isCorrect: true },
                            { text: "B. 5/9", isCorrect: false },
                            { text: "C. 1/2", isCorrect: false },
                            { text: "D. 5/2", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	find the quotient of 20 divided by 5/8?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 32", isCorrect: true },
                            { text: "B. 25", isCorrect: false },
                            { text: "C. 16", isCorrect: false },
                            { text: "D. 40", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	 what is 7/8 divided by 1/4",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 7/2", isCorrect:  true},
                            { text: "B. 7/4", isCorrect: false },
                            { text: "C. 7/3", isCorrect: false },
                            { text: "D. 7/1", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

              //start of 4th quiz===========================================================================================================

              {
                title: " Multiplying Decimals- easy",
                roomId: defaultActivityRoom4._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is 2.5 x 4? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 10", isCorrect: true },
                            { text: "B. 12", isCorrect: false },
                            { text: "C. 8", isCorrect: false },
                            { text: "D. 6", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	What is 1.2 x 3?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 3.6", isCorrect: true },
                            { text: "B. 2.4", isCorrect: false },
                            { text: "C. 4.2", isCorrect: false },
                            { text: "D. 5.0", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is 0.5 x 6?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 2.5", isCorrect: true },
                            { text: "B. 3.0", isCorrect: false },
                            { text: "C. 4.0", isCorrect: false },
                            { text: "D. 5.0", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	What is 3.1 x 2??",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 5.1", isCorrect: false },
                            { text: "B. 6.2", isCorrect: true },
                            { text: "C. 7.1", isCorrect: false },
                            { text: "D. 8.0", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	 What is 0.9 x 10",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 8.1", isCorrect:  false},
                            { text: "B. 9.0", isCorrect: true },
                            { text: "C. 10.0", isCorrect: false },
                            { text: "D. 11.0", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

            {
                title: "Multiplying Decimals - Hard",
                roomId: defaultActivityRoom4._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is 4.56 x 2.3? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 10.488", isCorrect: true },
                            { text: "B. 11.088", isCorrect: false },
                            { text: "C. 10.4888", isCorrect: false },
                            { text: "D. 11.0888", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	What is 7.89 x 1.2??  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 9.468", isCorrect: true },
                            { text: "B. 8.568", isCorrect: false},
                            { text: "C. 10.468", isCorrect: false },
                            { text: "D. 9.568", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is 3.75 x 4.2?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 15.75", isCorrect: true },
                            { text: "B. 16.25", isCorrect: false },
                            { text: "C. 15.75", isCorrect: false },
                            { text: "D. 14.75", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	What is 5.67 x 0.8?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 4.536", isCorrect: true },
                            { text: "B. 4.5360", isCorrect: false },
                            { text: "C. 4.53600", isCorrect: false },
                            { text: "D. 4.536000", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	 What is 2.34 x 3.6?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 8.424", isCorrect:  true},
                            { text: "B. 8.4240", isCorrect:  false},
                            { text: "C. 8.42400", isCorrect: false },
                            { text: "D. 8.424000", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

               //start of 5th quiz===========================================================================================================

               {
                title: " Theoretical Probability - Easy",
                roomId: defaultActivityRoom5._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	1.	What is the probability of rolling a 3 on a standard six-sided die?? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/6", isCorrect: true },
                            { text: "B. 1/3", isCorrect: false },
                            { text: "C. 1/2", isCorrect: false },
                            { text: "D. 1/4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	2.	If you flip a coin, what is the probability of getting heads?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/4", isCorrect: false },
                            { text: "B. 1/2", isCorrect: true},
                            { text: "C. 1/3", isCorrect: false },
                            { text: "D. 1/5", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	In a deck of 52 playing cards, what is the probability of drawing a heart?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/4", isCorrect: true },
                            { text: "B. 1/2", isCorrect: false },
                            { text: "C. 1/13", isCorrect: false },
                            { text: "D. 1/26", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	4.	What is the probability of getting an even number when rolling a standard six-sided die?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/6", isCorrect: false },
                            { text: "B. 1/3", isCorrect: false },
                            { text: "C. 1/2", isCorrect: true },
                            { text: "D. 1/4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.   If you have a bag with 3 red balls and 2 blue balls, what is the probability of drawing a red ball?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 2/5", isCorrect:  false},
                            { text: "B. 3/5", isCorrect: true },
                            { text: "C. 1/2", isCorrect: false },
                            { text: "D. 1/3", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

            {
                title: " Theoretical Probability- Hard",
                roomId: defaultActivityRoom5._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	A box contains 5 red, 3 blue, and 2 green marbles. What is the probability of randomly selecting a blue marble? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/5", isCorrect: false },
                            { text: "B. 3/10", isCorrect: true },
                            { text: "C. 1/3", isCorrect: false },
                            { text: "D. 1/2", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	If two dice are rolled, what is the probability that the sum of the numbers is 7?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 1/6", isCorrect: false },
                            { text: "B. 1/12", isCorrect: true},
                            { text: "C. 1/36", isCorrect: false },
                            { text: "D. 5/36", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.   In a class of 30 students, 18 are girls. If a student is chosen at random, what is the probability that the student is a boy?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 3/5", isCorrect: false },
                            { text: "B. 1/3", isCorrect: false },
                            { text: "C. 2/5", isCorrect: true },
                            { text: "D. 1/2", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	A card is drawn from a standard deck of 52 cards. What is the probability that it is either a queen or a heart?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 4/52", isCorrect: false },
                            { text: "B. 16/52", isCorrect: true },
                            { text: "C. 12/52", isCorrect: false },
                            { text: "D. 1/4", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	A bag contains 4 white, 5 black, and 6 yellow balls. If one ball is drawn at random, what is the probability that it is not black?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 5/15", isCorrect:  false},
                            { text: "B. 10/15", isCorrect: true },
                            { text: "C. 1/3", isCorrect: false },
                            { text: "D. 1/5", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

        

             //start of quiz 6 =====================================================================================================================================================
            {
                title: " Visualizing Solid Figures- Easy",
                roomId: defaultActivityRoom6._id,
                difficultyLevel: "easy",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is the shape of a basketball?? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Cube", isCorrect: false },
                            { text: "B. Sphere", isCorrect: true },
                            { text: "C. Cylinder", isCorrect: false },
                            { text: "D. Pyramid", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	Which solid figure has a circular base and a pointed top?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Cube", isCorrect: false },
                            { text: "B. Cone", isCorrect: true},
                            { text: "C. Cylinder", isCorrect: false },
                            { text: "D. Prism", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is the common shape of a cereal box??  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Sphere", isCorrect: false },
                            { text: "B. Cylinder", isCorrect: false },
                            { text: "C. Rectangular prism", isCorrect: true},
                            { text: "D. Cone", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	Which of the following is a three-dimensional figure?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Circle", isCorrect: false },
                            { text: "B. Triangle", isCorrect: false },
                            { text: "C. Square", isCorrect: false },
                            { text: "D. Cube", isCorrect: true }
                        ]
                    },
                    {
                        questionText: "5.	 What solid figure is shaped like a birthday hat?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Cylinder", isCorrect:  false},
                            { text: "B. Cone", isCorrect: true },
                            { text: "C. Sphere", isCorrect: false },
                            { text: "D. Prism", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },
           
            {
                title: "Visualizing Solid Figures - Hard",
                roomId: defaultActivityRoom6._id,
                difficultyLevel: "hard",
                isDraft: true, // Explicitly set to true
                archived: false, // Explicitly set to false
                questions: [
                
                    {
                        questionText: "1.	What is the number of faces on a cube?? ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 4", isCorrect: false },
                            { text: "B. 6", isCorrect: true },
                            { text: "C. 8", isCorrect: false },
                            { text: "D. 12", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "2.	Which solid figure has more edges than a pyramid?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Cube", isCorrect: true },
                            { text: "B. Cone", isCorrect: false},
                            { text: "C. Sphere", isCorrect: false },
                            { text: "D. Cylinder", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "3.	What is the shape of a regular die?  ",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Prism", isCorrect: false },
                            { text: "B. Pyramid", isCorrect: false },
                            { text: "C. Cube", isCorrect: true },
                            { text: "D. Cone", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "4.	How many vertices does a rectangular prism have??",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. 6", isCorrect: false },
                            { text: "B. 8", isCorrect: true },
                            { text: "C. 12", isCorrect: false },
                            { text: "D. 10", isCorrect: false }
                        ]
                    },
                    {
                        questionText: "5.	 Which of the following is a polyhedron?",
                        type: "multiple-choice",
                        choices: [
                            { text: "A. Sphere", isCorrect:  false},
                            { text: "B. Cylinder", isCorrect: false },
                            { text: "C. Cube", isCorrect: true },
                            { text: "D. Cone", isCorrect: false }
                        ]
                    }
                ],
                timer: 20, // Hard quiz timer (in minutes)
                maxAttempts: 3
            },

            //start of quiz 7=====================================================================================================================================================
                    {
                        title: " GMDAS - Easy",
                        roomId: defaultActivityRoom7._id,
                        difficultyLevel: "easy",
                        isDraft: true, // Explicitly set to true
                        archived: false, // Explicitly set to false
                        questions: [
                        
                            {
                                questionText: "1.	What is 5 + 3?? ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 6", isCorrect:  false },
                                    { text: "B. 7", isCorrect: false },
                                    { text: "C. 8", isCorrect: true },
                                    { text: "D. 9", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "2.	What is 10 - 4?  ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 5", isCorrect: false },
                                    { text: "B. 6", isCorrect: true},
                                    { text: "C. 7", isCorrect: false },
                                    { text: "D. 8", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "3.	What is 2 × 3?  ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 5", isCorrect: false  },
                                    { text: "B. 6", isCorrect: true },
                                    { text: "C. 7", isCorrect: false },
                                    { text: "D. 8", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "4.	What is 12 ÷ 4?",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 2", isCorrect: false },
                                    { text: "B. 3", isCorrect: true },
                                    { text: "C. 4", isCorrect: false },
                                    { text: "D. 5", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "5.	 What is 9 - 2?",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 6", isCorrect:  false},
                                    { text: "B. 7", isCorrect: true },
                                    { text: "C. 8", isCorrect: false },
                                    { text: "D. 9", isCorrect: false }
                                ]
                            }
                        ],
                        timer: 20, // Hard quiz timer (in minutes)
                        maxAttempts: 3
                    },

                    {
                        title: " GMDAS- Hard",
                        roomId: defaultActivityRoom7._id,
                        difficultyLevel: "hard",
                        isDraft: true, // Explicitly set to true
                        archived: false, // Explicitly set to false
                        questions: [
                        
                            {
                                questionText: "1.	What is (3 + 5) x 2? ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 12", isCorrect: false},
                                    { text: "B. 14", isCorrect: true },
                                    { text: "C. 16", isCorrect: false },
                                    { text: "D. 18", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "2.	What is 15 ÷ (3 + 2)?  ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 2", isCorrect: false },
                                    { text: "B. 3", isCorrect: false},
                                    { text: "C. 4", isCorrect: false },
                                    { text: "D. 5", isCorrect: true }
                                ]
                            },
                            {
                                questionText: "3.	What is 4 x (6 - 2) + 3?  ",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 18", isCorrect:  false},
                                    { text: "B. 12", isCorrect: true },
                                    { text: "C. 15", isCorrect: false },
                                    { text: "D. 21", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "4.	What is (8 + 4) ÷ 2 x 3?",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 18", isCorrect: false },
                                    { text: "B. 12", isCorrect: true },
                                    { text: "C. 15", isCorrect: false },
                                    { text: "D. 21", isCorrect: false }
                                ]
                            },
                            {
                                questionText: "5.	 What is 5 x (2 + 3) - 4?",
                                type: "multiple-choice",
                                choices: [
                                    { text: "A. 21", isCorrect:  true},
                                    { text: "B. 19", isCorrect:  false},
                                    { text: "C. 17", isCorrect: false },
                                    { text: "D. 15", isCorrect: false }
                                ]
                            }
                        ],
                        timer: 20, // Hard quiz timer (in minutes)
                        maxAttempts: 3
                    },

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

        return res.json({ success: true, message: 'Room created successfully!', roomId: newRoom._id });
    } catch (err) {
        console.error('Error creating room and associated resources:', err);

        // Check if the transaction is still active before aborting
        if (session.inTransaction()) {
            await session.abortTransaction();
            console.log('Transaction aborted.');
        }

    
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the room. Please try again.',
        });
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