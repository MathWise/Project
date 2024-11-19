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
                pdfFileId: { 
                    type: mongoose.Schema.Types.ObjectId, 
                    ref: 'GridFSFile', // Refers to GridFS files
                    required: true 
                },
                pdfFileName: { 
                    type: String, 
                    required: true 
                },
                archived: { 
                    type: Boolean, 
                    default: false 
                },
            },
        ],
    },
    { 
        timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;
