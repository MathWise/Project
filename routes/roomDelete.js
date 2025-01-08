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
const AuditLog = require('../models/auditLog');

// Helper function to delete files from GridFS
async function deleteFiles(gridFSBucket, fileIds) {
    const deletePromises = fileIds.map(async (fileId) => {
        if (!fileId) return;
        try {
            console.log(`Deleting file: ${fileId}`);
            await gridFSBucket.delete(new mongoose.Types.ObjectId(fileId));
        } catch (error) {
            console.warn(`Failed to delete file ${fileId}:`, error.message);
        }
    });
    await Promise.all(deletePromises);
}

router.delete('/delete-room/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { roomPassword } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: 'Invalid room ID.' });
        }

        const room = await Room.findById(roomId).select('+password');
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        if (room.roomPassword !== roomPassword) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Deletion not authorized.' });
        }

        console.log(`Deleting room: ${roomId}`);

        const pdfFileIds = [];
        const videoFileIds = [];
        const submissionFileIds = [];

        // Delete associated lesson rooms
        const lessonRooms = await LessonRoom.find({ roomId });
        if (!lessonRooms || lessonRooms.length === 0) {
            console.warn('No lesson rooms found for this room.');
        } else {
            for (const lessonRoom of lessonRooms) {
                if (!lessonRoom || !lessonRoom._id) {
                    console.warn('Lesson room is null or missing an _id. Skipping...');
                    continue;
                }
                console.log(`Deleting lesson room: ${lessonRoom._id}`);

                const lessons = await Lesson.find({ roomId: lessonRoom._id });
                if (lessons && lessons.length > 0) {
                    for (const lesson of lessons) {
                        for (const pdf of lesson.pdfFiles) {
                            if (pdf.pdfFileId) pdfFileIds.push(pdf.pdfFileId);
                        }
                    }
                }

                const videos = await Video.find({ roomId: lessonRoom._id });
                if (videos && videos.length > 0) {
                    for (const video of videos) {
                        for (const vid of video.videoFiles) {
                            if (vid.videoFileId) videoFileIds.push(vid.videoFileId);
                        }
                    }
                }

                await LessonRoom.deleteOne({ _id: lessonRoom._id }, { session });
            }
        }

        // Delete associated activity rooms
        const activityRooms = await ActivityRoom.find({ roomId });
        if (!activityRooms || activityRooms.length === 0) {
            console.warn('No activity rooms found for this room.');
        } else {
            for (const activityRoom of activityRooms) {
                if (!activityRoom || !activityRoom._id) {
                    console.warn('Activity room is null or missing an _id. Skipping...');
                    continue;
                }
                console.log(`Deleting activity room: ${activityRoom._id}`);

                const quizzes = await Quiz.find({ roomId: activityRoom._id });
                if (quizzes && quizzes.length > 0) {
                    for (const quiz of quizzes) {
                        await QuizResult.deleteMany({ quizId: quiz._id }, { session });
                        await Quiz.deleteOne({ _id: quiz._id }, { session });
                    }
                }

                const activities = await Activity.find({ roomId: activityRoom._id });
                if (activities && activities.length > 0) {
                    for (const activity of activities) {
                        for (const submission of activity.submissions) {
                            if (submission.fileId) submissionFileIds.push(submission.fileId);
                        }
                        for (const attachment of activity.fileAttachments) {
                            if (attachment._id) submissionFileIds.push(attachment._id);
                        }
                        await Activity.deleteOne({ _id: activity._id }, { session });
                    }
                }

                await ActivityRoom.deleteOne({ _id: activityRoom._id }, { session });
            }
        }

        await Room.deleteOne({ _id: roomId }, { session });

        await session.commitTransaction();
        console.log(`Room ${roomId} and all associated data deleted successfully.`);

         // Create the audit log entry
         await AuditLog.create({
            userName: `${req.user.first_name} ${req.user.last_name}`, // Combine first and last name
            userId: req.user._id, // User ID from authenticated request
            action: 'delete', // Action is 'delete'
            roomId: room._id, // Room ID of the deleted room
            roomName: room.name, // Name of the deleted room
        });

        const gridFSBucketPDF = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const gridFSBucketVideo = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'videos' });
        const gridFSBucketSubmissions = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'submissions' });

        await deleteFiles(gridFSBucketPDF, pdfFileIds);
        await deleteFiles(gridFSBucketVideo, videoFileIds);
        await deleteFiles(gridFSBucketSubmissions, submissionFileIds);

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
