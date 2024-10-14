const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Room'
    },
    pdfFiles: [
        {
            pdfFileId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'pdfs.files'
            },
            pdfFileName: {
                type: String
            }
        }
    ],
    videoFiles: [
        {
            videoFileId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'videos.files' // Reference to the GridFS videos collection
            },
            videoFileName: {
                type: String
            }
        }
    ]
});

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;
