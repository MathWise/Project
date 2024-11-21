const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Room = require('../models/room'); // Import Room model
const router = express.Router();

// Route to request a password reset email
router.post('/forgot-room-password', async (req, res) => {
    const { roomId, email } = req.body;

    try {
        const room = await Room.findById(roomId);

        if (!room || room.email !== email) {
            return res.status(404).json({ message: 'Room or email not found.' });
        }

        // Generate a reset token and expiration time
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

        // Save the reset token and expiration in the room document
        room.resetToken = resetToken;
        room.resetTokenExpiration = resetTokenExpiration;
        await room.save();

        // Create the reset URL
        const resetURL = `http://localhost:8080/reset-room-password/${resetToken}`;

        // Send email with the reset link
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Room Password Reset Request',
            html: `<p>You requested a password reset for your room: "${room.name}".</p>
                   <p>Click the link below to reset your password:</p>
                   <a href="${resetURL}">${resetURL}</a>
                   <p>If you did not request this, please ignore this email.</p>`,
        });

        res.json({ message: 'Password reset email sent successfully.' });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({ message: 'An error occurred while sending the password reset email.' });
    }
});

// Route to render the reset password form
router.get('/reset-room-password/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const room = await Room.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }, // Ensure the token is not expired
        });

        if (!room) {
            return res.status(400).send('Invalid or expired reset token.');
        }

        res.render('reset-room-password', { token }); // Render a reset-password page
    } catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).send('An error occurred.');
    }
});

// Route to handle new password submission
router.post('/reset-room-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const room = await Room.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }, // Ensure the token is not expired
        });

        if (!room) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        room.roomPassword = newPassword; // Update the password directly or hash it as needed
        room.resetToken = undefined; // Clear the token
        room.resetTokenExpiration = undefined; // Clear the expiration
        await room.save();

        res.send('Password has been successfully reset.');
    } catch (error) {
        console.error('Error resetting room password:', error);
        res.status(500).json({ message: 'An error occurred while resetting the password.' });
    }
});

module.exports = router;
