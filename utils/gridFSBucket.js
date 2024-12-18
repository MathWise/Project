const mongoose = require('mongoose');

// Ensure mongoose is connected before accessing GridFS
const connection = mongoose.connection;

let gfs;

// Wait for the MongoDB connection to be open before using GridFS
connection.once('open', () => {
    // GridFSBucket is available after connection
    console.log("Connected to MongoDB and GridFS initialized.");
});

// Function to get a GridFS bucket by bucket name
const getGridFSBucket = (bucketName) => {
    if (!bucketName) {
        throw new Error('Bucket name is required.');
    }
    return new mongoose.mongo.GridFSBucket(connection.db, {
        bucketName: bucketName
    });
};

module.exports = { getGridFSBucket };
