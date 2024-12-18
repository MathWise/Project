const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const ActivityRoom = require('../models/activityRoom');
const Lesson = require('../models/lesson');
const Video = require('../models/video');
const Activity = require('../models/activityM');
const Quiz = require('../models/QuizActivityRoom');
const QuizResult = require('../models/QuizResult');

router.delete('/delete-room/:roomId', async (req, res) => {
    const { roomId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Validate the roomId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid room ID.' });
        }

        // Find and delete the room
        const room = await Room.findByIdAndDelete(roomId, { session });
        if (!room) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        console.log(`Deleting room: ${roomId}`);

        // Initialize GridFS buckets
        const gridFSBucketPDF = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const gridFSBucketVideo = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'videos' });
        const gridFSBucketSubmissions = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'submissions' });

        // DELETE LESSON ROOMS
        const lessonRooms = await LessonRoom.find({ roomId });
        const lessonRoomDeletePromises = lessonRooms.map(async (lessonRoom) => {
            console.log(`Deleting lesson room: ${lessonRoom._id}`);

            // Delete PDFs from Lesson
            const lessons = await Lesson.find({ roomId: lessonRoom._id });
            const pdfDeletePromises = lessons.flatMap(async (lesson) => {
                return lesson.pdfFiles.map(async (pdf) => {
                    if (pdf.pdfFileId) {
                        try {
                            console.log(`Deleting PDF file: ${pdf.pdfFileId}`);
                            await gridFSBucketPDF.delete(new mongoose.Types.ObjectId(pdf.pdfFileId));
                        } catch (error) {
                            console.warn(`Failed to delete PDF file: ${pdf.pdfFileId}`, error.message);
                        }
                    }
                });
            });

            // Delete Videos from Video model
            const videos = await Video.find({ roomId: lessonRoom._id });
            const videoDeletePromises = videos.flatMap(async (video) => {
                return video.videoFiles.map(async (vid) => {
                    if (vid.videoFileId) {
                        try {
                            console.log(`Deleting video file: ${vid.videoFileId}`);
                            await gridFSBucketVideo.delete(new mongoose.Types.ObjectId(vid.videoFileId));
                        } catch (error) {
                            console.warn(`Failed to delete video file: ${vid.videoFileId}`, error.message);
                        }
                    }
                });
            });

            await Promise.all([...pdfDeletePromises, ...videoDeletePromises]);

            // Delete the lesson room itself
            await LessonRoom.deleteOne({ _id: lessonRoom._id }, { session });
        });

        // DELETE ACTIVITY ROOMS
        const activityRooms = await ActivityRoom.find({ roomId });
        const activityRoomDeletePromises = activityRooms.map(async (activityRoom) => {
            console.log(`Deleting activity room: ${activityRoom._id}`);

            // Delete quizzes and quiz results
            const quizzes = await Quiz.find({ roomId: activityRoom._id });
            const quizDeletePromises = quizzes.map(async (quiz) => {
                console.log(`Deleting quiz: ${quiz._id}`);
                await QuizResult.deleteMany({ quizId: quiz._id }, { session });
                await Quiz.deleteOne({ _id: quiz._id }, { session });
            });

            // Delete activities and their submissions
            const activities = await Activity.find({ roomId: activityRoom._id });
            const activityDeletePromises = activities.map(async (activity) => {
                console.log(`Deleting activity: ${activity._id}`);

                // Delete submissions
                const submissionDeletePromises = activity.submissions.map(async (submission) => {
                    if (submission.fileId) {
                        try {
                            console.log(`Deleting submission file: ${submission.fileId}`);
                            await gridFSBucketSubmissions.delete(new mongoose.Types.ObjectId(submission.fileId));
                        } catch (error) {
                            console.warn(`Failed to delete submission file: ${submission.fileId}`, error.message);
                        }
                    }
                });

                // Delete attachments
                const attachmentDeletePromises = activity.fileAttachments.map(async (attachment) => {
                    if (attachment._id) {
                        try {
                            console.log(`Deleting attachment file: ${attachment._id}`);
                            await gridFSBucketSubmissions.delete(new mongoose.Types.ObjectId(attachment._id));
                        } catch (error) {
                            console.warn(`Failed to delete attachment file: ${attachment._id}`, error.message);
                        }
                    }
                });

                await Promise.all([...submissionDeletePromises, ...attachmentDeletePromises]);

                // Delete the activity itself
                await Activity.deleteOne({ _id: activity._id }, { session });
            });

            await Promise.all([...quizDeletePromises, ...activityDeletePromises]);

            // Delete the activity room itself
            await ActivityRoom.deleteOne({ _id: activityRoom._id }, { session });
        });

        // Wait for all deletions to complete
        await Promise.all([...lessonRoomDeletePromises, ...activityRoomDeletePromises]);

        console.log(`Room ${roomId} and all associated data deleted successfully.`);
        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Room and all associated data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting room and associated data:', error);
        await session.abortTransaction();
        res.status(500).json({ success: false, message: 'Failed to delete room and associated data.', error: error.message });
    } finally {
        session.endSession();
    }
});


module.exports = router;
