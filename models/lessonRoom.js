const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lessonRoomSchema = new Schema({
    subject: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    roomId: { // Reference to the room
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room', // This references the original 'Room' model
        required: true
    },
    archived: { // New field to mark the lesson room as archived
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('LessonRoom', lessonRoomSchema);
