const { MongoClient, GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

let submissionBucket;

const initActivityBucket = async () => {
    try {
        const client = await MongoClient.connect(mongoURI); // Ensure this succeeds
        const db = client.db();

        submissionBucket = new GridFSBucket(db, { bucketName: 'submissions' });

        console.log('Activity Submissions Bucket Initialized');
    } catch (error) {
        console.error('Error initializing activity submissions bucket:', error);
        throw error;
    }
};

const getSubmissionBucket = () => {
    if (!submissionBucket) {
        throw new Error('Activity Submissions Bucket not initialized. Call initActivityBucket() first.');
    }
    return submissionBucket;
};

module.exports = { initActivityBucket, getSubmissionBucket };
