// models/lesson.js
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
        },
        pdfFiles: [
            {
                pdfFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
                pdfFileName: { type: String },
                archived: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true } 
);
const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;
