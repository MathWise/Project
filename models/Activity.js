// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String }, // Optional
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true },
    fileAttachments: [
        {
            fileName: { type: String },
            filePath: { type: String }
        }
    ], // Optional
    videoLink: { type: String }, // Optional
    points: { type: Number, required: true }, // Required
    deadline: { type: Date, required: true }, // Required
    createdAt: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false }
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
