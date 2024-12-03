const express = require('express');
const multer = require('multer');
const middleware = require('../middleware');
const { DateTime } = require('luxon');
const { ensureLoggedIn, ensureAdminLoggedIn } = middleware;
const Quiz = require('../models/QuizActivityRoom'); 
const QuizResult = require('../models/QuizResult');
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const { getSubmissionBucket } = require('../config/activityGridFS');
const Activity = require('../models/activityM'); // Adjust the path to your Activity model
const ActivityRoom = require('../models/activityRoom');
const mime = require('mime-types');
const XLSX = require('xlsx');

const router = express.Router();
const db = mongoose.connection;



// GridFS storage for activity submissions
const storage = multer.memoryStorage();

const uploadSubmission = multer({ storage });

// Route to create an activity
router.post('/activity/create', ensureAdminLoggedIn, uploadSubmission.single('attachment'), async (req, res) => {
    const { title, description, points, deadline, aactivityRoomId, isDraft } = req.body;

    try {
        const activityRoom = await ActivityRoom.findById(aactivityRoomId);
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/activities');
        }

        if (!req.file) {
            req.flash('error', 'No file uploaded.');
            return res.redirect('/admin/activities');
        }

        const submissionBucket = getSubmissionBucket();
        const uploadStream = submissionBucket.openUploadStream(req.file.originalname);
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            try {
                // Retrieve the uploaded file's metadata from the GridFS bucket
                const file = await submissionBucket.find({ filename: req.file.originalname }).toArray();

                if (file.length === 0) {
                    throw new Error('Uploaded file not found in GridFS.');
                }

                const fileAttachment = {
                    fileName: req.file.originalname,
                    _id: file[0]._id, // Use the first file (should match the uploaded file)
                };


        const newActivity = new Activity({
            title,
            description,
            roomId: new mongoose.Types.ObjectId(aactivityRoomId),
            fileAttachments: [fileAttachment],
            points: parseInt(points, 10),
            deadline: deadline ? new Date(deadline) : null, // Handle optional deadlines
            isDraft: isDraft === 'true', // Convert draft flag to boolean
        });

        await newActivity.save();
        req.flash('success', isDraft === 'true' ? 'Activity saved as draft!' : 'Activity created successfully!');
        res.redirect(`/admin/activities/${activityRoom.roomId}`);
    } catch (error) {
        console.error('Error creating activity:', error);
        req.flash('error', 'Failed to create activity.');
        res.redirect('/admin/activities');
    }
});
uploadStream.on('error', (error) => {
    console.error('Error uploading file to GridFS:', error);
    req.flash('error', 'Failed to upload file.');
    res.redirect('/admin/activities');
});
} catch (error) {
console.error('Error creating activity:', error);
res.status(500).json({ message: 'Failed to create activity' });
}
});


router.get('/activities/data/:activityRoomId', ensureAdminLoggedIn, async (req, res) => {
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


// Toggle draft status for an activity
router.post('/activity/toggle-draft/:activityId', ensureAdminLoggedIn, async (req, res) => {
    const { activityId } = req.params;

    try {
        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        activity.isDraft = !activity.isDraft;
        await activity.save();

        const status = activity.isDraft ? 'private (Draft)' : 'public';
        res.status(200).json({ message: `Activity is now ${status}.` });
    } catch (error) {
        console.error('Error toggling activity draft status:', error);
        res.status(500).json({ message: 'Failed to toggle activity status.' });
    }
});


// Route to archive an activity
router.post('/archive-activity/:activityId', ensureAdminLoggedIn, async (req, res) => {
    const { activityId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
            return res.status(400).json({ error: 'Invalid activity ID.' });
        }

        const activity = await Activity.findByIdAndUpdate(
            activityId,
            { archived: true, archivedAt: new Date() }, // Mark as archived
            { new: true }
        );

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        res.status(200).json({ message: 'Activity archived successfully.' });
    } catch (error) {
        console.error('Error archiving activity:', error);
        res.status(500).json({ message: 'Failed to archive activity.' });
    }
});

// Route to unarchive an activity
router.post('/unarchive-activity/:activityId', ensureAdminLoggedIn, async (req, res) => {
    const { activityId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
            return res.status(400).json({ error: 'Invalid activity ID.' });
        }

        const activity = await Activity.findByIdAndUpdate(
            activityId,
            { archived: false, archivedAt: null }, // Mark as unarchived
            { new: true }
        );

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found.' });
        }

        res.status(200).json({ message: 'Activity unarchived successfully.' });
    } catch (error) {
        console.error('Error unarchiving activity:', error);
        res.status(500).json({ message: 'Failed to unarchive activity.' });
    }
});


router.get('/activity/details/:id', ensureLoggedIn, async (req, res) => {
    const { id } = req.params;
    
    try {

        const act = await Activity.findById(id).lean();
        if (!act) {
            req.flash('error', 'Quiz not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const activityRoom = await ActivityRoom.findById(act.roomId).lean();
        if (!activityRoom) {
            req.flash('error', 'Activity room not found.');
            return res.redirect('/admin/homeAdmin');
        }

        const activity = await Activity.findById(req.params.id)
            .populate({
                path: 'roomId', // Populate ActivityRoom
                populate: { path: 'roomId', model: 'Room' }, // Populate Room inside ActivityRoom
            });

        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect('/admin/activities');
        }

        // Render template with activity and flash messages
        res.render('admin/activityDetails', {
            activity,
            currentUser: req.user,
            successMessages: req.flash('success'),
            errorMessages: req.flash('error'),
            roomId: activityRoom.roomId
        });
    } catch (error) {
        console.error('Error fetching activity details:', error);
        req.flash('error', 'Unable to load activity details.');
        res.redirect('/admin/activities');
    }
});




// Submit quiz route with enhanced debug logging
router.post('/activity/submit/:activityId', ensureLoggedIn, uploadSubmission.single('submissionFile'), async (req, res) => {
    const { activityId } = req.params;

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect(`/admin/activity/details/${activityId}`);
    }

    try {
        // Find the activity
        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
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
                res.redirect(`/admin/activity/details/${activityId}`);
            } catch (error) {
                console.error('Error processing uploaded file:', error);
                req.flash('error', 'Failed to process uploaded file.');
                res.redirect(`/admin/activity/details/${activityId}`);
            }
        });

        uploadStream.on('error', (error) => {
            console.error('Error during file upload:', error);
            req.flash('error', 'File upload failed.');
            res.redirect(`/admin/activity/details/${activityId}`);
        });
    } catch (error) {
        console.error('Error during submission:', error);
        req.flash('error', 'Failed to process uploaded file.');
        res.redirect(`/admin/activity/details/${activityId}`);
    }
});


// Replace an existing submission
router.post('/activity/replace/:activityId', ensureLoggedIn, uploadSubmission.single('submissionFile'), async (req, res) => {
    const { activityId } = req.params;

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect(`/admin/activity/details/${activityId}`);
    }

    try {
        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
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
                res.redirect(`/admin/activity/details/${activityId}`);
            } catch (saveError) {
                console.error('Error saving updated submission:', saveError);
                req.flash('error', 'Failed to save updated submission.');
                res.redirect(`/admin/activity/details/${activityId}`);
            }
        });

        uploadStream.on('error', (uploadError) => {
            console.error('Error uploading new file:', uploadError);
            req.flash('error', 'Failed to upload the new file.');
            res.redirect(`/admin/activity/details/${activityId}`);
        });
    } catch (error) {
        console.error('Error replacing submission:', error);
        req.flash('error', 'Failed to replace submission.');
        res.redirect(`/admin/activity/details/${activityId}`);
    }
});

// Remove a submission
router.post('/activity/remove/:activityId', ensureLoggedIn, async (req, res) => {
    try {
        const { activityId } = req.params;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
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
        res.redirect(`/admin/activity/details/${activityId}`);
    } catch (error) {
        console.error('Error removing submission:', error);
        req.flash('error', 'Failed to remove submission.');
        res.redirect(`/admin/activity/details/${activityId}`);
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







router.post('/activity/grade/:activityId/:submissionId', ensureAdminLoggedIn, async (req, res) => {
    try {
        const { activityId, submissionId } = req.params;
        const { grade, feedback } = req.body;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
        }

         // Validate grade is within the range of 1 to 100
         const parsedGrade = parseInt(grade, 10);
         if (isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 100) {
             req.flash('error', 'Grade must be a number between 1 and 100.');
             return res.redirect(`/admin/activity/details/${activityId}`);
         }
         

        const submission = activity.submissions.id(submissionId);
        if (!submission) {
            req.flash('error', 'Submission not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
        }

        submission.grade = grade;
        submission.feedback = feedback;

        await activity.save();

        req.flash('success', 'Grade submitted successfully.');
        res.redirect(`/admin/activity/details/${activityId}`);
    } catch (error) {
        console.error('Error grading submission:', error);
        req.flash('error', 'Failed to submit grade.');
        res.redirect(`/admin/activity/details/${activityId}`);
    }
});

router.get('/activity/export/:activityId', ensureAdminLoggedIn, async (req, res) => {
    const { activityId } = req.params;

    try {
        // Fetch the activity and its submissions
        const activity = await Activity.findById(activityId);
        if (!activity) {
            req.flash('error', 'Activity not found.');
            return res.redirect(`/admin/activity/details/${activityId}`);
        }

        // Prepare data for the Excel file
        const submissionsData = activity.submissions.map((submission) => {
            const isLate = new Date(submission.submittedAt) > new Date(activity.deadline);
            return {
                Name: submission.userName,
                Grade: submission.grade !== null ? submission.grade : 'Not Graded',
                Feedback: submission.feedback || 'No Feedback',
                'Submission Time': new Date(submission.submittedAt).toLocaleString(),
                'Late Submission': isLate ? 'Yes' : 'No',
            };
        });

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(submissionsData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

        // Generate a buffer for the Excel file
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Set response headers for downloading the file
        res.setHeader('Content-Disposition', `attachment; filename="Submissions_${activity.title}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting submissions:', error);
        req.flash('error', 'Failed to export submissions.');
        res.redirect(`/admin/activity/details/${activityId}`);
    }
});

router.delete('/delete-activity/:activityId', async (req, res) => {
    const { activityId } = req.params;

    try {
        // Check if the activityId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(activityId)) {
            return res.status(400).json({ success: false, message: 'Invalid activity ID' });
        }

        // Find the activity in the database
        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ success: false, message: 'Activity not found' });
        }

        // Log the activity object to check file IDs
        console.log('Activity object:', activity);

        // Get the GridFS bucket
        const submissionBucket = getSubmissionBucket();

        // Delete associated files in GridFS
        if (activity.submissions.length > 0) {
            for (const submission of activity.submissions) {
                if (submission.fileId) {
                    console.log(`Attempting to delete file with ID: ${submission.fileId}`);
                    const file = await submissionBucket.find({ _id: submission.fileId }).toArray();
                    if (file.length === 0) {
                        console.error(`File with ID ${submission.fileId} not found in GridFS`);
                        continue; // Skip this file if it's not found
                    }
                    try {
                        await submissionBucket.delete(submission.fileId);
                        console.log(`Deleted file from GridFS: ${submission.fileId}`);
                    } catch (err) {
                        console.error(`Error deleting file ${submission.fileId}:`, err.message);
                    }
                }
            }
        }

        // Delete file attachments from GridFS
        if (activity.fileAttachments.length > 0) {
            for (const attachment of activity.fileAttachments) {
                if (attachment._id) {
                    console.log(`Attempting to delete file attachment with ID: ${attachment._id}`);
                    const file = await submissionBucket.find({ _id: attachment._id }).toArray();
                    if (file.length === 0) {
                        console.error(`File attachment with ID ${attachment._id} not found in GridFS`);
                        continue; // Skip this attachment if it's not found
                    }
                    try {
                        await submissionBucket.delete(attachment._id);
                        console.log(`Deleted file attachment from GridFS: ${attachment._id}`);
                    } catch (err) {
                        console.error(`Error deleting file attachment ${attachment._id}:`, err.message);
                    }
                }
            }
        }

        // Delete the activity from the database
        await Activity.findByIdAndDelete(activityId);

        res.json({ success: true, message: 'Activity deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete activity', error: err.message });
    }
});

router.delete('/delete-activity-room/:activityRoomId', async (req, res) => {
    const { activityRoomId } = req.params;

    try {
        // Validate the activityRoomId
        if (!mongoose.Types.ObjectId.isValid(activityRoomId)) {
            return res.status(400).json({ success: false, message: 'Invalid activity room ID.' });
        }

        // Find and delete the activity room
        const activityRoom = await ActivityRoom.findByIdAndDelete(activityRoomId);

        if (!activityRoom) {
            return res.status(404).json({ success: false, message: 'Activity room not found.' });
        }

        console.log(`Deleting activity room: ${activityRoomId}`);

        // Delete associated quizzes and quiz results
        const quizzes = await Quiz.find({ roomId: activityRoomId });
        const quizDeletePromises = quizzes.map(async (quiz) => {
            console.log(`Deleting quiz results for quiz: ${quiz._id}`);
            await QuizResult.deleteMany({ quizId: quiz._id }); // Delete quiz results
            console.log(`Deleting quiz: ${quiz._id}`);
            await Quiz.deleteOne({ _id: quiz._id }); // Delete the quiz itself
        });

        // Delete associated activities and their submissions/attachments
        const gridFSBucketSubmissions = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'submissions'
        });

        const activities = await Activity.find({ roomId: activityRoomId });
        const activityDeletePromises = activities.map(async (activity) => {
            console.log(`Deleting submissions and attachments for activity: ${activity._id}`);

            // Delete submissions in GridFS
            const submissionDeletePromises = activity.submissions.map(async (submission) => {
                if (submission.fileId) {
                    try {
                        console.log(`Deleting submission file: ${submission.fileId}`);
                        await gridFSBucketSubmissions.delete(new mongoose.Types.ObjectId(submission.fileId));
                    } catch (error) {
                        console.warn(`Failed to delete submission file: ${submission.fileId}`, error.message);
                    }
                }
            });

            // Delete file attachments in GridFS
            const attachmentDeletePromises = activity.fileAttachments.map(async (attachment) => {
                if (attachment._id) {
                    try {
                        console.log(`Deleting attachment file: ${attachment._id}`);
                        await gridFSBucketSubmissions.delete(new mongoose.Types.ObjectId(attachment._id));
                    } catch (error) {
                        console.warn(`Failed to delete attachment file: ${attachment._id}`, error.message);
                    }
                }
            });

            // Wait for all submission and attachment deletions
            await Promise.all([...submissionDeletePromises, ...attachmentDeletePromises]);

            console.log(`Deleting activity: ${activity._id}`);
            await Activity.deleteOne({ _id: activity._id }); // Delete the activity
        });

        // Wait for all deletions to complete
        await Promise.all([...quizDeletePromises, ...activityDeletePromises]);

        console.log(`Activity room ${activityRoomId} and all associated data deleted successfully.`);
        res.status(200).json({ success: true, message: 'Activity room and related data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting activity room and related data:', error);
        res.status(500).json({ success: false, message: 'Failed to delete activity room and related data.', error: error.message });
    }
});




// Additional activity-related routes (e.g., for submissions, grading, etc.) can be added here

module.exports = router;
