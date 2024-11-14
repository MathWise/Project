// config/gridFS.js
const { MongoClient, GridFSBucket } = require('mongodb');
const mongoURI = process.env.MONGODB_URI;

let pdfBucket;
let videoBucket;

const initBuckets = async () => {
    const client = await MongoClient.connect(mongoURI);
    const db = client.db();
    pdfBucket = new GridFSBucket(db, { bucketName: 'pdfs' });
    videoBucket = new GridFSBucket(db, { bucketName: 'videos' });
    console.log("Initialized PDF and Video Buckets");
};

const getPdfBucket = () => pdfBucket;
const getVideoBucket = () => videoBucket;

module.exports = { initBuckets, getPdfBucket, getVideoBucket };
