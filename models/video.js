// models/video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
        },
        videoFiles: [
            {
                videoFileId: { 
                    type: mongoose.Schema.Types.ObjectId, 
                    ref: 'GridFSFile', // Refers to GridFS files
                    required: true 
                },
                videoFileName: { 
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

const Video = mongoose.model('Video', videoSchema);
module.exports = Video;
