const fs = require('fs');
const path = require('path');
const Lesson = require('../models/lesson'); // Ensure correct casing matches your model file
const Video = require('../models/video'); // Ensure correct casing matches your model file

/**
 * Helper to upload files to GridFS
 * @param {string} filePath - The local path of the file to upload.
 * @param {object} bucket - The GridFS bucket instance.
 * @param {object} metadata - Metadata to attach to the uploaded file.
 * @returns {Promise} Resolves when the file is successfully uploaded.
 */
async function uploadFileToGridFS(filePath, bucket, metadata) {
    const fileName = path.basename(filePath);
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath);
        const uploadStream = bucket.openUploadStream(fileName, { metadata });

        stream.pipe(uploadStream)
            .on('finish', () => {
                console.log(`File uploaded successfully: ${fileName}`);
                resolve(uploadStream.id); // Return the ID of the uploaded file
            })
            .on('error', (error) => {
                console.error(`Error uploading file: ${fileName}`, error);
                reject(error);
            });
    });
}

/**
 * Helper to find uploaded files in GridFS by filename
 * @param {object} bucket - The GridFS bucket instance.
 * @param {string} fileName - The name of the file to find.
 * @returns {Promise<object>} The file document from GridFS.
 */
async function findUploadedFile(bucket, fileName) {
    const files = await bucket.find({ filename: fileName }).toArray();
    if (files.length === 0) {
        throw new Error(`File not found: ${fileName}`);
    }
    console.log(`File found in GridFS: ${fileName}`);
    return files[0];
}

/**
 * Helper to save a lesson with associated PDF files
 * @param {string} roomId - The ID of the room the lesson belongs to.
 * @param {object|null} pdfFile - The uploaded PDF file document from GridFS.
 * @returns {Promise<object>} The saved Lesson document.
 */
async function saveLesson(roomId, pdfFile = null) {
    if (!pdfFile) {
        throw new Error("PDF file is required to save a Lesson.");
    }

    const lesson = new Lesson({
        roomId,
        pdfFiles: [{
            pdfFileId: pdfFile._id,
            pdfFileName: pdfFile.filename,
            archived: false,
        }],
    });

    await lesson.save();
    console.log(`Lesson saved successfully for Room ID: ${roomId}`);
    return lesson;
}

/**
 * Helper to save a video with associated Video files
 * @param {string} roomId - The ID of the room the video belongs to.
 * @param {object|null} videoFile - The uploaded Video file document from GridFS.
 * @returns {Promise<object>} The saved Video document.
 */
async function saveVideo(roomId, videoFile = null) {
    if (!videoFile) {
        throw new Error("Video file is required to save a Video.");
    }

    const video = new Video({
        roomId,
        videoFiles: [{
            videoFileId: videoFile._id,
            videoFileName: videoFile.filename,
            archived: false,
        }],
    });

    await video.save();
    console.log(`Video saved successfully for Room ID: ${roomId}`);
    return video;
}

module.exports = {
    uploadFileToGridFS,
    findUploadedFile,
    saveLesson,
    saveVideo, // Export the new helper function
};
