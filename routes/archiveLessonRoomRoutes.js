// routes/archiveLessonRoomRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const LessonRoom = require('../models/lessonRoom');
const { ensureAdminLoggedIn } = require('../middleware');

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
