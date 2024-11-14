const LessonRoom = require('../models/lessonRoom');
const ActivityRoom = require('../models/activityRoom');
const Quiz = require('../models/QuizActivityRoom');
const Lesson = require('../models/lesson');
const { pdfBucket, videoBucket } = require('../config/gridFS'); // Ensure pdfBucket and videoBucket are imported

const archiveItem = async (Model, itemId) => { 
    return Model.findByIdAndUpdate(itemId, { isArchived: true });
};

const cascadeArchive = async (roomId) => {
    await LessonRoom.updateMany({ roomId }, { $set: { archived: true } });
    await ActivityRoom.updateMany({ roomId }, { $set: { archived: true } });
    await Quiz.updateMany({ roomId }, { $set: { archived: true } });
    await Lesson.updateOne(
        { roomId },
        { $set: { "pdfFiles.$[].archived": true, "videoFiles.$[].archived": true } }
    );
};

const cascadeUnarchive = async (roomId) => {
    await LessonRoom.updateMany({ roomId }, { $set: { archived: false } });
    await ActivityRoom.updateMany({ roomId }, { $set: { archived: false } });
    await Quiz.updateMany({ roomId }, { $set: { archived: false } });
    await Lesson.updateOne(
        { roomId },
        { $set: { "pdfFiles.$[].archived": false, "videoFiles.$[].archived": false } }
    );
};

// New function to delete room and associated content
const cascadeDelete = async (roomId) => {
    try {
        // Fetch lessons to delete associated PDF and video files from GridFS
        const lessons = await Lesson.find({ roomId });

        for (const lesson of lessons) {
            for (const pdf of lesson.pdfFiles) {
                await pdfBucket.delete(pdf.pdfFileId);
                console.log(`Deleted PDF with ID: ${pdf.pdfFileId}`);
            }
            for (const video of lesson.videoFiles) {
                await videoBucket.delete(video.videoFileId);
                console.log(`Deleted video with ID: ${video.videoFileId}`);
            }
        }

        // Delete all related data
        await LessonRoom.deleteMany({ roomId });
        await ActivityRoom.deleteMany({ roomId });
        await Quiz.deleteMany({ roomId });
        await Lesson.deleteMany({ roomId });

        console.log(`Successfully deleted all associated content for room ID: ${roomId}`);
    } catch (error) {
        console.error('Error during cascade delete:', error);
        throw new Error('Failed to delete associated content');
    }
};

module.exports = { archiveItem, cascadeArchive, cascadeUnarchive, cascadeDelete };
