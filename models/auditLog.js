const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // This references the User model
    },
    action: {
        type: String,
        enum: ['delete'], // You can add other actions here if needed
        default: 'delete',
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Room', // Reference to Room model
    },
    roomName: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
