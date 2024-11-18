const { MongoClient, GridFSBucket } = require('mongodb');
const mongoURI = process.env.MONGODB_URI;

let pdfBucket;
let videoBucket;

const initBuckets = async () => {
    try {
        const client = await MongoClient.connect(mongoURI); 
        const db = client.db();

        pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
        videoBucket = new GridFSBucket(db, { bucketName: 'videos' });

        console.log("GridFS Buckets Initialized: PDFs and Videos");
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

module.exports = { initBuckets, getPdfBucket, getVideoBucket };
