const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // User model for finding users
const ResetPassword = require('../models/resetPassword'); // ResetPassword model for handling reset tokens
const router = express.Router();

// Render the forget password form
router.get('/mail/forgetpassword', (req, res) => {
  res.render('mail/forgetpassword'); // Ensure you have forgetpassword.ejs in your views folder
});

// Route to request a password reset
router.post('/mail/forgetpassword', async (req, res) => {
  const { email } = req.body;

  try {
    console.log('Received request for email:', email); // Log the email received

    // Attempt to find the user by email
    const user = await User.findOne({ email });
    console.log('User found:', user); // Log the found user or null

    if (!user) {
      console.log('No account with that email found.'); // Log this event
      return res.status(400).send('No account with that email found.');
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

    // Save the reset token and expiration in a new ResetPassword document
    const resetRecord = new ResetPassword({
      userId: user._id,
      resetToken,
      resetTokenExpiration,
    });

    await resetRecord.save();

    // Send email to the user with the reset link
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
      },
    });

    const resetURL = `http://localhost:8080/reset-password/${resetToken}`; // Ensure the correct port is used

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset.</p>
             <p>Click this <a href="${resetURL}">link</a> to set a new password.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', user.email); // Log success
      // Send HTML response with a button to return to the login page
      res.status(200).send(`
        <h3>Password reset link sent to your email.</h3>
        <p>Please check your email and follow the instructions to reset your password.</p>
        <a href="/login"><button>Go to Login</button></a>
      `);


  } catch (error) {
    console.error('Error processing request:', error); // Log the complete error
    res.status(500).send('Error processing request.'); // Return generic error to user
  }
});

// Route to render the reset password page
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Find the reset record with the token and check if it is still valid
    const resetRecord = await ResetPassword.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }, // Check if the token has not expired
    });

    if (!resetRecord) {
      return res.status(400).send('Token is invalid or has expired.');
    }

    // Render the reset password form (make sure you have reset-password.ejs)
    res.render('reset-password', { token });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing request.');
  }
});

// Route to handle the new password submission
router.post('/reset-password', async (req, res) => {
  console.log('Reset Password POST request received'); // Log to confirm receipt of request
  const { token, newPassword } = req.body;

  try {
    // Find the reset record using the token and check if it is still valid
    const resetRecord = await ResetPassword.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }, // Check if the token has not expired
    });

    if (!resetRecord) {
      return res.status(400).send('Token is invalid or has expired.');
    }

    // Find the user associated with the reset request
    const user = await User.findById(resetRecord.userId);
    if (!user) {
      return res.status(400).send('User not found.');
    }

    // Hash the new password using bcrypt
    user.password = await bcrypt.hash(newPassword, 12); // Hash the new password
    await user.save(); // Save the updated user record

    // Delete the reset record after successful password reset
    await ResetPassword.deleteOne({ _id: resetRecord._id });

    res.send('Password has been successfully reset.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing request.');
  }
});

module.exports = router;
