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
    email: { type: String, required: true, validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Simple email regex
        },
        message: props => `${props.value} is not a valid email address!`,
      }, },
    isArchived: {
        type: Boolean,
        default: false  // By default, rooms are not archived
    },
    resetToken: { type: String },
    resetTokenExpiration: { type: Date },
});

module.exports = mongoose.model('Room', roomSchema);
