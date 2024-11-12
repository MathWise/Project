const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        unique: true // Ensure one lesson per room
    },
    pdfFiles: [{
        pdfFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
        pdfFileName: { type: String },
        archived: { type: Boolean, default: false }  // Add this field to track archival status
    }],
    videoFiles: [{
        videoFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
        videoFileName: { type: String },
        archived: { type: Boolean, default: false }  // Optionally add an archived field for video files if needed
    }]
});

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;
