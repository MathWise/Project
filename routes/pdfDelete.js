const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const Lesson = require('../models/lesson');
const Video = require('../models/video');
const { ensureAdminLoggedIn } = require('../middleware');


const router = express.Router();

// Route to delete a PDF
router.delete('/delete-pdf/:pdfFileId', ensureAdminLoggedIn, async (req, res) => {
    const { pdfFileId } = req.params;

    // Validate the provided PDF file ID
    const pdfObjectId = mongoose.Types.ObjectId.isValid(pdfFileId) ? new mongoose.Types.ObjectId(pdfFileId) : null;
    if (!pdfObjectId) {
        console.error('Invalid PDF file ID:', pdfFileId);
        return res.status(400).json({ error: 'Invalid PDF file ID.' });
    }

    try {
        // 1. Remove the PDF from the Lesson collection (all lessons that reference it)
        const updateResult = await Lesson.updateMany(
            { 'pdfFiles.pdfFileId': pdfObjectId },
            { $pull: { pdfFiles: { pdfFileId: pdfObjectId } } }
        );

        if (updateResult.modifiedCount === 0) {
            console.warn('No lessons found with the specified PDF file ID.');
            return res.status(404).json({ error: 'No lessons found referencing the PDF.' });
        }
        console.log(`${updateResult.modifiedCount} lessons updated to remove PDF file.`);

        // 2. Remove the PDF file from GridFS
        const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });

        // Check if the file exists before trying to delete it
        const file = await gridFSBucket.find({ _id: pdfObjectId }).toArray();
        if (file.length === 0) {
            console.warn('File not found in GridFS:', pdfFileId);
            return res.status(404).json({ error: 'File not found in storage.' });
        }

        // Proceed with deletion from GridFS
        await gridFSBucket.delete(pdfObjectId);
        console.log('PDF file successfully deleted from GridFS.');

        return res.status(200).json({ message: `PDF with ID ${pdfFileId} deleted successfully.` });

    } catch (error) {
        console.error('Error during PDF deletion:', error);
        return res.status(500).json({ error: 'Failed to delete PDF. Please try again.' });
    }
});

// Route to delete a video
router.delete('/delete-video/:videoFileId', ensureAdminLoggedIn, async (req, res) => {
    const { videoFileId } = req.params;

    // Validate the provided video file ID
    const videoObjectId = mongoose.Types.ObjectId.isValid(videoFileId) ? new mongoose.Types.ObjectId(videoFileId) : null;
    if (!videoObjectId) {
        console.error('Invalid Video file ID:', videoFileId);
        return res.status(400).json({ error: 'Invalid Video file ID.' });
    }

    try {
        // 1. Remove the video reference from the Video collection (all videos that reference it)
        const updateResult = await Video.updateMany(
            { 'videoFiles.videoFileId': videoObjectId },
            { $pull: { videoFiles: { videoFileId: videoObjectId } } }
        );

        if (updateResult.modifiedCount === 0) {
            console.warn('No videos found with the specified Video file ID.');
            return res.status(404).json({ error: 'No videos found referencing the video.' });
        }
        console.log(`${updateResult.modifiedCount} videos updated to remove Video file.`);

        // 2. Remove the video file from GridFS
        const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'videos' });

        // Check if the file exists before trying to delete it
        const file = await gridFSBucket.find({ _id: videoObjectId }).toArray();
        if (file.length === 0) {
            console.warn('File not found in GridFS:', videoFileId);
            return res.status(404).json({ error: 'File not found in storage.' });
        }

        // Proceed with deletion from GridFS
        await gridFSBucket.delete(videoObjectId);
        console.log('Video file successfully deleted from GridFS.');

        return res.status(200).json({ message: `Video with ID ${videoFileId} deleted successfully.` });

    } catch (error) {
        console.error('Error during Video deletion:', error);
        return res.status(500).json({ error: 'Failed to delete Video. Please try again.' });
    }
});

// Trigger MongoDB compaction (for GridFS cleanup)
router.post('/trigger-compaction', ensureAdminLoggedIn, async (req, res) => {
    try {
        // MongoDB Atlas automatically manages compaction, so no need for manual triggering
        return res.status(200).json({ message: 'No manual compaction required. Atlas handles this automatically.' });
    } catch (error) {
        console.error('Error triggering compaction:', error);
        return res.status(500).json({ error: 'Failed to trigger compaction.' });
    }
});



module.exports = router;
