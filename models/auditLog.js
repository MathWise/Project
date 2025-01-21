const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true, // It's good to require userName
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Reference to the User model
    },
    action: {
        type: String,
        enum: ['delete', 'grantAccess', 'revokeAccess','archive','unarchive'], // Action types: delete, grant access, revoke access
        required: true,
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The user whose access is granted or revoked
        required: true, // Make targetUserId required to track the specific user
    },
    targetUserName: {
        type: String,
        required: true, // Track the name of the user whose access is affected
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room', // Optional: This is only relevant for actions involving rooms
        default: null, // Default to null if there's no associated room
    },
    roomName: {
        type: String,
        default: 'N/A', // Default if no room is involved
    },
    timestamp: {
        type: Date,
        default: Date.now, // Automatically set the timestamp when the action is logged
    },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
