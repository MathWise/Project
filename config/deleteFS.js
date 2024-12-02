const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { ObjectId } = mongoose.Types;
const Lesson = require('../models/lesson');
require('dotenv').config();

// Initialize GridFS stream
const conn = mongoose.createConnection(process.env.MONGODB_URI, {
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    bufferCommands: false,
});

let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('pdfs');
});

async function deletePdfFile(fileId) {
    try {
        console.log('Starting to delete PDF file', fileId);

        console.time('updateMany');
        const updateResult = await Lesson.updateMany(
            { 'pdfFiles.pdfFileId': new ObjectId(fileId) },
            { $pull: { pdfFiles: { pdfFileId: new ObjectId(fileId) } } }
        );
        console.timeEnd('updateMany');
        console.log(`${updateResult.modifiedCount} lesson(s) updated to remove file reference`);

        const file = await gfs.files.findOne({ _id: new ObjectId(fileId) });
        if (!file) {
            console.log('File not found in GridFS');
            return;
        }

        await gfs.files.deleteOne({ _id: new ObjectId(fileId) });
        console.log(`File ${fileId} deleted successfully from GridFS`);

    } catch (error) {
        console.error('Error deleting PDF file:', error);
    }
}

// If running as standalone script
(async () => {
    try {
        await deletePdfFile('674db290c9c4b76980db2686');  // Replace with your fileId
    } catch (error) {
        console.error('Error in delete operation:', error);
    } finally {
        mongoose.connection.close();
    }
})();
