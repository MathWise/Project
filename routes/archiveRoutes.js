// const express = require('express');
// const mongoose = require('mongoose');
// const { ObjectId } = mongoose.Types;
// const Room = require('../models/room');
// const Lesson = require('../models/lesson');
// const Video = require('../models/video'); // Import the new Video model
// const LessonRoom = require('../models/lessonRoom');
// const { ensureAdminLoggedIn } = require('../middleware');

// const router = express.Router();

// const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);



// // Route to archive a specific lesson room
// router.post('/archive-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
//     const { lessonRoomId } = req.params;
//     try {
//         await LessonRoom.findByIdAndUpdate(lessonRoomId, { archived: true });
//         res.status(200).json({ message: 'Lesson room archived successfully.' });
//     } catch (error) {
//         console.error('Error archiving lesson room:', error);
//         res.status(500).json({ error: 'Failed to archive lesson room.' });
//     }
// });

// // Route to unarchive a specific lesson room
// router.post('/unarchive-lesson-room/:lessonRoomId', ensureAdminLoggedIn, async (req, res) => {
//     const { lessonRoomId } = req.params;
//     try {
//         await LessonRoom.findByIdAndUpdate(lessonRoomId, { archived: false });
//         res.status(200).json({ message: 'Lesson room unarchived successfully.' });
//     } catch (error) {
//         console.error('Error unarchiving lesson room:', error);
//         res.status(500).json({ error: 'Failed to unarchive lesson room.' });
//     }
// });

// // Route to archive a specific PDF
// router.post('/archive-pdf/:pdfFileId', ensureAdminLoggedIn, async (req, res) => {
//     const pdfFileId = req.params.pdfFileId;
//     try {
//         const result = await Lesson.updateOne(
//             { "pdfFiles.pdfFileId": new ObjectId(pdfFileId) },
//             { $set: { "pdfFiles.$.archived": true } }
//         );
//         res.status(200).json({ message: result.nModified ? 'PDF archived successfully.' : 'PDF not found.' });
//     } catch (error) {
//         console.error('Error archiving PDF:', error);
//         res.status(500).json({ error: 'Failed to archive PDF.' });
//     }
// });

// // Route to unarchive a specific PDF
// router.post('/unarchive-pdf/:pdfFileId', ensureAdminLoggedIn, async (req, res) => {
//     const pdfFileId = req.params.pdfFileId;
//     try {
//         const result = await Lesson.updateOne(
//             { "pdfFiles.pdfFileId": new ObjectId(pdfFileId) },
//             { $set: { "pdfFiles.$.archived": false } }
//         );
//         res.status(200).json({ message: result.nModified ? 'PDF unarchived successfully.' : 'PDF not found.' });
//     } catch (error) {
//         console.error('Error unarchiving PDF:', error);
//         res.status(500).json({ error: 'Failed to unarchive PDF.' });
//     }
// });

// // Route to archive a specific video
// router.post('/archive-video/:videoFileId', ensureAdminLoggedIn, async (req, res) => {
//     const { videoFileId } = req.params;
//     try {
//         const result = await Video.updateOne(
//             { "videoFiles.videoFileId": new ObjectId(videoFileId) },
//             { $set: { "videoFiles.$.archived": true } }
//         );
//         res.status(200).json({ message: result.nModified ? 'Video archived successfully.' : 'Video not found.' });
//     } catch (error) {
//         console.error('Error archiving video:', error);
//         res.status(500).json({ error: 'Failed to archive video.' });
//     }
// });

// // Route to unarchive a specific video
// router.post('/unarchive-video/:videoFileId', ensureAdminLoggedIn, async (req, res) => {
//     const { videoFileId } = req.params;
//     try {
//         const result = await Video.updateOne(
//             { "videoFiles.videoFileId": new ObjectId(videoFileId) },
//             { $set: { "videoFiles.$.archived": false } }
//         );
//         res.status(200).json({ message: result.nModified ? 'Video unarchived successfully.' : 'Video not found.' });
//     } catch (error) {
//         console.error('Error unarchiving video:', error);
//         res.status(500).json({ error: 'Failed to unarchive video.' });
//     }
// });



// // Route to display archived lesson rooms and media files
// router.get('/lessonArchive/:roomId', ensureAdminLoggedIn, async (req, res) => {
//     const { roomId } = req.params;

//     try {
//         // Step 1: Validate `roomId`
//         const roomObjectId = mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : null;
//         if (!roomObjectId) {
//             req.flash('error', 'Invalid Room ID.');
//             return res.redirect('/admin/homeAdmin');
//         }

//         console.log("Room ID:", roomObjectId);

//         // Step 2: Retrieve the main `Room` document
//         const room = await Room.findById(roomObjectId);
//         if (!room) {
//             req.flash('error', 'Room not found.');
//             return res.redirect('/admin/homeAdmin');
//         }

//         // Step 3: Find all `LessonRoom` documents linked to this `Room` (by `roomId`)
//         const archivedLessonRooms = await LessonRoom.find({ roomId: roomObjectId, archived: true }).populate('roomId');

//         // Step 4: Retrieve archived media files from each `LessonRoom`
//         let archivedPdfs = [];
//         let archivedVideos = [];

//         for (const lessonRoom of archivedLessonRooms) {  // Use `lessonRoom` here instead of redeclaring `archivedLessonRooms`
//             const lesson = await Lesson.findOne({ roomId: lessonRoom._id });
//             const videoLesson = await Video.findOne({ roomId: lessonRoom._id });

//             if (lesson && lesson.pdfFiles) {
//                 archivedPdfs = archivedPdfs.concat(lesson.pdfFiles.filter(pdf => pdf.archived));
//             }

//             if (videoLesson && videoLesson.videoFiles) {
//                 archivedVideos = archivedVideos.concat(videoLesson.videoFiles.filter(video => video.archived));
//             }
//         }

//         console.log('Archived PDFs:', archivedPdfs);
//         console.log('Archived Videos:', archivedVideos);

//         // Step 5: Render the view with roomId and archived media
//         res.render('admin/lessonArchive', {
//             roomId,           // Pass roomId directly here
//             archivedLessonRooms,
//             archivedPdfs,
//             archivedVideos
//         });
//     } catch (error) {
//         console.error('Error fetching archived content:', error);
//         req.flash('error', 'Failed to load archived lessons.');
//         res.redirect('/admin/homeAdmin');
//     }
// });


// module.exports = router;
