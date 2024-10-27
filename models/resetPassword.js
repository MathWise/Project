// /models/resetPassword.js
const mongoose = require('mongoose');

// Define the ResetPassword Schema for handling password reset tokens
const resetPasswordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resetToken: { type: String, required: true },
  resetTokenExpiration: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Export the ResetPassword model
module.exports = mongoose.model('ResetPassword', resetPasswordSchema);
