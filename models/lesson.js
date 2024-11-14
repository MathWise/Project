// models/lesson.js
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
        archived: { type: Boolean, default: false }
    }]
});

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;
