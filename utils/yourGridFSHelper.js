const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

let gfs;

mongoose.connection.once('open', () => {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('files'); // Default collection name, could also be 'videos', 'pdfs' based on your need
    console.log('GridFS is ready to use');
});

// Function to get the GridFS bucket based on the collection name
const getGridFSBucket = (bucketName = 'files') => {
    if (!gfs) {
        throw new Error('GridFS not initialized');
    }
    return gfs.bucket(bucketName);
};

// Function to delete file and chunks from GridFS
const deleteFileFromGridFS = async (fileId, bucketName = 'files') => {
    try {
        const bucket = getGridFSBucket(bucketName); // Get the GridFS bucket
        await bucket.delete(fileId); // This deletes both the file and associated chunks
        console.log(`File with ID ${fileId} and associated chunks deleted successfully from ${bucketName}.`);
    } catch (err) {
        console.error(`Error deleting file with ID ${fileId} from ${bucketName}:`, err);
    }
};

module.exports = { getGridFSBucket, deleteFileFromGridFS };
