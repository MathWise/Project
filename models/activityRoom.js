const mongoose = require('mongoose');

const activityRoomSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    activityType: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    archived: { 
        type: Boolean,
        default: false
    }
});

const ActivityRoom = mongoose.model('ActivityRoom', activityRoomSchema);
module.exports = ActivityRoom;
