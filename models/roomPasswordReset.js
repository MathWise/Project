const mongoose = require('mongoose');

const RoomPasswordResetSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, // Reference to the Room
  resetToken: { type: String, required: true }, // Unique token for the reset link
  resetTokenExpiration: { type: Date, required: true }, // Token expiration time
});

module.exports = mongoose.model('RoomPasswordReset', RoomPasswordResetSchema);
