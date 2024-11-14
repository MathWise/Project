// models/video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    videoFiles: [{
        videoFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GridFSFile' },
        videoFileName: { type: String },
        archived: { type: Boolean, default: false }
    }]
});

const Video = mongoose.model('Video', videoSchema);
module.exports = Video;
