const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb'); // Correct import
const LessonRoom = require('../models/lessonRoom');
const PdfProgress = require('../models/PdfProgress');
const { ensureAdminLoggedIn } = require('../middleware');
const Lesson = require('../models/lesson');
const Video = require('../models/video');

const router = express.Router();

// Route to display archived lesson rooms
router.get('/lessonRoomArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
        if (!roomObjectId) {
            req.flash('error', 'Invalid Room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        // Fetch archived lesson rooms linked to this room ID
        const archivedLessonRooms = await LessonRoom.find({ roomId: roomObjectId, archived: true }).populate('roomId');
        res.render('admin/lessonRoomArchive', { roomId, archivedLessonRooms });
    } catch (error) {
        console.error('Error fetching archived lesson rooms:', error);
        req.flash('error', 'Failed to load archived lesson rooms.');
        res.redirect('/admin/homeAdmin');
    }
});


// Route to archive a specific lesson room
router.post('/archive-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { lessonRoomId } = req.params;
    try {
        await LessonRoom.findByIdAndUpdate(lessonRoomId, { archived: true });
        res.status(200).json({ message: 'Lesson room archived successfully.' });
    } catch (error) {
        console.error('Error archiving lesson room:', error);
        res.status(500).json({ error: 'Failed to archive lesson room.' });
    }
});


router.delete('/delete-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
    const { lessonRoomId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Find and delete the lesson room
        const lessonRoom = await LessonRoom.findByIdAndDelete(lessonRoomId, { session });

        if (!lessonRoom) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Lesson room not found.' });
        }

        // Delete associated PDFs and videos
        const gridFSBucketPDF = new GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
        const gridFSBucketVideo = new GridFSBucket(mongoose.connection.db, { bucketName: 'videos' });

        const pdfFilesCursor = gridFSBucketPDF.find({ filename: new RegExp(`^${lessonRoomId}-`) });
        const pdfFiles = await pdfFilesCursor.toArray();
        const videoFilesCursor = gridFSBucketVideo.find({ filename: new RegExp(`^${lessonRoomId}-`) });
        const videoFiles = await videoFilesCursor.toArray();

        const pdfDeletePromises = pdfFiles.map(pdfFile => gridFSBucketPDF.delete(pdfFile._id));
        const videoDeletePromises = videoFiles.map(videoFile => gridFSBucketVideo.delete(videoFile._id));

        await Promise.all([...pdfDeletePromises, ...videoDeletePromises]);

        console.log(`Lesson room ${lessonRoomId} and all associated PDFs/Videos deleted successfully.`);
        await session.commitTransaction();
        res.status(200).json({ message: 'Lesson room and associated content deleted successfully.' });
    } catch (error) {
        console.error('Error deleting lesson room:', error);
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to delete lesson room.' });
    } finally {
        session.endSession();
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

module.exports = router;
