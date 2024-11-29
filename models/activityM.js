const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    fileName: { type: String, required: true }, // Original file name
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true }, // GridFS file ID
    submittedAt: { type: Date, default: Date.now },
    grade: {  type: Number, 
        default: null, 
        min: 0, 
        max: 100 }, // Admin-assigned grade
    feedback: { type: String, default: '' }, // Admin feedback
});

const activitySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true },
    fileAttachments: [
        {
            fileName: { type: String },
            _id: { type: mongoose.Schema.Types.ObjectId },
        }
    ], // Optional
    videoLink: { type: String }, // Optional
    points: { type: Number, required: true },
    submissions: [submissionSchema], // Submissions array
    deadline: { type: Date, required: true }, 
    createdAt: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
