const { MongoClient, GridFSBucket } = require('mongodb');
const mongoURI = process.env.MONGODB_URI;

let pdfBucket;
let videoBucket;
let submissionBucket;

const initBuckets = async () => {
    try {
        const client = await MongoClient.connect(mongoURI); 
        const db = client.db();

        pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
        videoBucket = new GridFSBucket(db, { bucketName: 'videos' });
        submissionBucket = new GridFSBucket(db, { bucketName: 'submissions' });

        console.log("GridFS Buckets Initialized: PDFs, Videos , and Submissions");
    } catch (error) {
        console.error("Error initializing GridFS Buckets:", error);
        throw error;
    }
};

const getPdfBucket = () => {
    if (!pdfBucket) {
        throw new Error("PDF Bucket not initialized. Call initBuckets() first.");
    }
    return pdfBucket;
};

const getVideoBucket = () => {
    if (!videoBucket) {
        throw new Error("Video Bucket not initialized. Call initBuckets() first.");
    }
    return videoBucket;
};
const getSubmissionBucket = () => { // Getter for the submissions bucket
    if (!submissionBucket) {
        throw new Error("Submission Bucket not initialized. Call initBuckets() first.");
    }
    return submissionBucket;
};

module.exports = { initBuckets, getPdfBucket, getVideoBucket, getSubmissionBucket };
