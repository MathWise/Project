const express = require('express');
const multer = require('multer');
const middleware = require('../middleware');
const { DateTime } = require('luxon');
const { ensureLoggedIn,  ensureStudentLoggedIn } = middleware;
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const { getSubmissionBucket } = require('../config/activityGridFS');
const Activity = require('../models/activityM'); // Adjust the path to your Activity model
const ActivityRoom = require('../models/activityRoom');
const mime = require('mime-types');
const XLSX = require('xlsx');

const router = express.Router();

// GridFS storage for activity submissions
const storage = multer.memoryStorage();

const uploadSubmission = multer({ storage });



router.get('/activities/data/:activityRoomId', ensureStudentLoggedIn, async (req, res) => {
    const { activityRoomId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(activityRoomId)) {
            return res.status(400).json({ message: 'Invalid activity room ID.' });
        }

        const isAdmin = req.user.role === 'admin';
        const query = {
            roomId: new mongoose.Types.ObjectId(activityRoomId),
            archived: false,
            ...(isAdmin ? {} : { isDraft: false }) // Include `isDraft: false` for non-admins
        };

        const activities = await Activity.find(query);

        console.log('Activities fetched:', activities.length);
        res.json({ activities });
    } catch (err) {
        console.error('Error fetching activities:', err);
        res.status(500).json({ message: 'Error fetching activities.' });
    }
});


router.get('/activity/details/:id', ensureLoggedIn, async (req, res) => {
    const { id } = req.params;
    
    try {

        const act = await Activity.findById(id).lean();
        if (!act) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/user/homeUser');
        }

        const activityRoom = await ActivityRoom.findById(act.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/user/homeUser');
        }

        const activity = await Activity.findById(req.params.id)
            .populate({
                path: 'roomId', // Populate ActivityRoom
                populate: { path: 'roomId', model: 'Room' }, // Populate Room inside ActivityRoom
            });

        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect('/user/activities');
        }

        // Render template with activity and flash messages
        res.render('user/userActivityDetails', {
            activity,
            currentUser: req.user,
            successMessages: req.flash('success'),
            errorMessages: req.flash('error'),
            roomId: activityRoom.roomId
        });
    } catch (error) {
        console.error('Error fetching activity details:', error);
        req.flash('error', 'Unable to load activity details.');
        res.redirect('/user/activities');
    }
});




// Submit quiz route with enhanced debug logging
router.post('/activity/submit/:activityId', ensureLoggedIn, uploadSubmission.single('submissionFile'), async (req, res) => {
    const { activityId } = req.params;

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect(`/user/activity/details/${activityId}`);
    }

    try {
        // Find the activity
        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/user/activity/details/${activityId}`);
        }

        // Initialize GridFSBucket
        const submissionBucket = getSubmissionBucket();

        // Create an upload stream for the file
        const uploadStream = submissionBucket.openUploadStream(req.file.originalname, {
            metadata: { uploadedBy: req.user._id, activityId },
        });

        // Pipe the file buffer into the upload stream
        uploadStream.end(req.file.buffer);

        // Handle the finish event of the upload
        uploadStream.on('finish', async () => {
            try {
                console.log('Upload finished successfully.');
                
                // Fetch the uploaded file's metadata
                const file = await submissionBucket.find({ filename: req.file.originalname }).toArray();
                if (file.length === 0) {
                    throw new Error('Uploaded file not found in GridFS.');
                }

                const uploadedFile = file[0]; // Fetch the first matching file (should be the uploaded one)
                console.log('Uploaded file metadata:', uploadedFile);

                // Add submission to activity
                activity.submissions.push({
                    userId: req.user._id,
                    userName: `${req.user.first_name} ${req.user.last_name}`,
                    fileName: uploadedFile.filename,
                    fileId: uploadedFile._id, // GridFS file ID
                    submittedAt: new Date(),
                });

                await activity.save();
                req.flash('success', 'Submission successful!');
                res.redirect(`/user/activity/details/${activityId}`);
            } catch (error) {
                console.error('Error processing uploaded file:', error);
                req.flash('error', 'Failed to process uploaded file.');
                res.redirect(`/user/activity/details/${activityId}`);
            }
        });

        uploadStream.on('error', (error) => {
            console.error('Error during file upload:', error);
            req.flash('error', 'File upload failed.');
            res.redirect(`/user/activity/details/${activityId}`);
        });
    } catch (error) {
        console.error('Error during submission:', error);
        req.flash('error', 'Failed to process uploaded file.');
        res.redirect(`/user/activity/details/${activityId}`);
    }
});


// Replace an existing submission
router.post('/activity/replace/:activityId', ensureLoggedIn, uploadSubmission.single('submissionFile'), async (req, res) => {
    const { activityId } = req.params;

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect(`/user/activity/details/${activityId}`);
    }

    try {
        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/user/activity/details/${activityId}`);
        }

        // Initialize GridFSBucket
        const submissionBucket = getSubmissionBucket();

        // Find the user's existing submission
        const submission = activity.submissions.find(sub => sub.userId.toString() === req.user._id.toString());
        if (submission) {
            try {
                // Attempt to remove the old file from GridFS
                await submissionBucket.delete(new mongoose.Types.ObjectId(submission.fileId));
            } catch (deleteError) {
                console.warn(`Warning: Old file with ID ${submission.fileId} not found in GridFS. Proceeding.`);
            }
        }

        // Upload the new file to GridFS
        const uploadStream = submissionBucket.openUploadStream(req.file.originalname, {
            metadata: { uploadedBy: req.user._id, activityId },
        });

        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async (uploadedFile) => {
            try {
                // Fetch the uploaded file's metadata
                const files = await submissionBucket.find({ filename: req.file.originalname }).toArray();
                if (files.length === 0) {
                    throw new Error('Uploaded file not found in GridFS.');
                }

                const uploadedFile = files[0]; // Use the first matching file
                console.log('Uploaded file metadata:', uploadedFile);

               
                // Update or create the submission entry
                if (submission) {
                    submission.fileName = uploadedFile.filename;
                    submission.fileId = uploadedFile._id;
                    submission.submittedAt = new Date();
                } else {
                    activity.submissions.push({
                        userId: req.user._id,
                        userName: `${req.user.first_name} ${req.user.last_name}`,
                        fileName: uploadedFile.filename,
                        fileId: uploadedFile._id,
                        submittedAt: new Date(),
                    });
                }

                await activity.save();
                req.flash('success', 'Submission replaced successfully.');
                res.redirect(`/user/activity/details/${activityId}`);
            } catch (saveError) {
                console.error('Error saving updated submission:', saveError);
                req.flash('error', 'Failed to save updated submission.');
                res.redirect(`/user/activity/details/${activityId}`);
            }
        });

        uploadStream.on('error', (uploadError) => {
            console.error('Error uploading new file:', uploadError);
            req.flash('error', 'Failed to upload the new file.');
            res.redirect(`/user/activity/details/${activityId}`);
        });
    } catch (error) {
        console.error('Error replacing submission:', error);
        req.flash('error', 'Failed to replace submission.');
        res.redirect(`/user/activity/details/${activityId}`);
    }
});

// Remove a submission
router.post('/activity/remove/:activityId', ensureLoggedIn, async (req, res) => {
    try {
        const { activityId } = req.params;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/user/activity/details/${activityId}`);
        }

        // Find and remove the user's submission
        const submissionIndex = activity.submissions.findIndex(sub => sub.userId.toString() === req.user._id.toString());
        if (submissionIndex !== -1) {
            const submission = activity.submissions[submissionIndex];
            const submissionBucket = getSubmissionBucket();

            // Remove the file from GridFS
            await submissionBucket.delete(new mongoose.Types.ObjectId(submission.fileId));

            // Remove the submission from the array
            activity.submissions.splice(submissionIndex, 1);
            await activity.save();
        }

        req.flash('success', 'Submission removed successfully.');
        res.redirect(`/user/activity/details/${activityId}`);
    } catch (error) {
        console.error('Error removing submission:', error);
        req.flash('error', 'Failed to remove submission.');
        res.redirect(`/user/activity/details/${activityId}`);
    }
});



router.get('/test-submission', async (req, res) => {
    const submissionBucket = getSubmissionBucket();
    const filename = 'test-file.txt';
    const fs = require('fs');

    try {
        const uploadStream = submissionBucket.openUploadStream(filename);
        fs.createReadStream('./test-file.txt').pipe(uploadStream);

        uploadStream.on('finish', () => {
            console.log('File uploaded successfully:', uploadStream.id);
            res.send(`File uploaded with ID: ${uploadStream.id}`);
        });

        uploadStream.on('error', (error) => {
            console.error('Error during file upload:', error);
            res.status(500).send('File upload failed.');
        });
    } catch (error) {
        console.error('Error testing submission upload:', error);
        res.status(500).send('Error testing submission upload.');
    }
});





// Additional activity-related routes (e.g., for submissions, grading, etc.) can be added here

module.exports = router;
