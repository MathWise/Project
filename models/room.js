// models/room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    gradeLevel: {
        type: String,
        required: true
    },
    teacherName: {
        type: String,
        required: true
    },
    roomPassword: {
        type: String,
        required: true
    },
    isArchived: {
        type: Boolean,
        default: false  // By default, rooms are not archived
    }
});

module.exports = mongoose.model('Room', roomSchema);
