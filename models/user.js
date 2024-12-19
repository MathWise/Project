const mongoose = require('mongoose');

// Define the User Schema based on your form fields
const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  grade: { type: String, required: true },
  section: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  age: { type: Number, required: true },
  password: { type: String, required: true }, // Hashed and salted password
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  role: { type: String, default: 'student' },
  emailVerified: { type: Boolean, default: false }, // New field
  verificationToken: { type: String } // New field
});

// Export the User model
module.exports = mongoose.model('User', userSchema);
