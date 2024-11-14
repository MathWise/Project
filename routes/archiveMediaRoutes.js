// routes/archiveMediaRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/room');
const LessonRoom = require('../models/lessonRoom');
const Lesson = require('../models/lesson');
const Video = require('../models/video');
const { ensureAdminLoggedIn } = require('../middleware');

const router = express.Router();

// Route to display archived PDFs and Videos for a given Room
router.get('/pdfAndVideoArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
    const { roomId } = req.params;

    try {
        // Validate and convert roomId to ObjectId
        const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
        if (!roomObjectId) {
            req.flash('error', 'Invalid Room ID.');
            return res.redirect('/admin/homeAdmin');
        }

        // Find all LessonRooms within the Room
        const lessonRooms = await LessonRoom.find({ roomId: roomObjectId });

        // Extract all lessonRoom IDs
        const lessonRoomIds = lessonRooms.map(room => room._id);

        // Find all Lessons and Videos associated with these LessonRooms
        const lessons = await Lesson.find({ roomId: { $in: lessonRoomIds } });
        const videoLessons = await Video.find({ roomId: { $in: lessonRoomIds } });

        // Collect only archived PDFs and Videos
        const archivedPdfs = lessons.flatMap(lesson => lesson.pdfFiles.filter(pdf => pdf.archived));
        const archivedVideos = videoLessons.flatMap(video => video.videoFiles.filter(video => video.archived));

        // Render the archive page with roomId and archived media
        res.render('admin/pdfAndVideoArchive', { roomId, archivedPdfs, archivedVideos });
    } catch (error) {
        console.error('Error fetching archived media:', error);
        req.flash('error', 'Failed to load archived media.');
        res.redirect('/admin/homeAdmin');
    }
});

// Route to archive a specific PDF
router.post('/archive-pdf/:pdfFileId', ensureAdminLoggedIn, async (req, res) => {
    const pdfFileId = req.params.pdfFileId;

    try {
        // Convert pdfFileId to ObjectId
        const pdfObjectId = mongoose.Types.ObjectId.isValid(pdfFileId) ? new mongoose.Types.ObjectId(pdfFileId) : null;

        if (!pdfObjectId) {
            return res.status(400).json({ error: 'Invalid PDF file ID.' });
        }

        const result = await Lesson.updateOne(
            { "pdfFiles.pdfFileId": pdfObjectId },
            { $set: { "pdfFiles.$.archived": true } }
        );

        if (result.nModified) {
            res.status(200).json({ message: 'PDF archived successfully.' });
        } else {
            res.status(404).json({ message: 'PDF not found.' });
        }
    } catch (error) {
        console.error('Error archiving PDF:', error);
        res.status(500).json({ error: 'Failed to archive PDF.' });
    }
});


// Route to unarchive a specific PDF
router.post('/unarchive-pdf/:pdfFileId', ensureAdminLoggedIn, async (req, res) => {
    const pdfFileId = req.params.pdfFileId;
    
    try {
        // Convert pdfFileId to ObjectId
        const pdfObjectId = mongoose.Types.ObjectId.isValid(pdfFileId) ? new mongoose.Types.ObjectId(pdfFileId) : null;

        if (!pdfObjectId) {
            return res.status(400).json({ error: 'Invalid PDF file ID.' });
        }

        const result = await Lesson.updateOne(
            { "pdfFiles.pdfFileId": pdfObjectId },
            { $set: { "pdfFiles.$.archived": false } }
        );

        if (result.nModified) {
            res.status(200).json({ message: 'PDF unarchived successfully.' });
        } else {
            res.status(404).json({ message: 'PDF not found.' });
        }
    } catch (error) {
        console.error('Error unarchiving PDF:', error);
        res.status(500).json({ error: 'Failed to unarchive PDF.' });
    }
});

module.exports = router;
