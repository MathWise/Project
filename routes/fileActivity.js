const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const mime = require('mime-types');

router.get('/file/:fileId', async (req, res) => {
    const { fileId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).send('Invalid file ID.');
        }

        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'submissions' });

        // Find file metadata in GridFS
        const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
        if (files.length === 0) {
            return res.status(404).send('File not found.');
        }

        const file = files[0];
        const contentType = mime.lookup(file.filename) || 'application/octet-stream'; // Detect MIME type

        // Set headers for inline display
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${file.filename}"`,
        });

        // Stream the file content to the response
        const fileStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(404).send('File not found.');
        });
    } catch (error) {
        console.error('Error retrieving file:', error);
        res.status(500).send('Error retrieving file.');
    }
});

module.exports = router;
