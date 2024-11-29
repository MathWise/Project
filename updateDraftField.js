require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('./models/QuizActivityRoom'); // Adjust the path to your Quiz model
const Activity = require('./models/activityM'); // Adjust the path to your Activity model

const updateDraftField = async () => {
    let connection;
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in the environment variables.');
        }

        // Connect to MongoDB
        connection = await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Update only documents missing the `isDraft` field
        const quizResult = await Quiz.updateMany(
            { isDraft: { $exists: false } },
            { $set: { isDraft: false } }
        );

        const activityResult = await Activity.updateMany(
            { isDraft: { $exists: false } },
            { $set: { isDraft: false } }
        );

        console.log(`Updated ${quizResult.modifiedCount} quizzes.`);
        console.log(`Updated ${activityResult.modifiedCount} activities.`);
    } catch (error) {
        console.error('Error updating draft field:', error);
    } finally {
        if (connection) {
            await mongoose.connection.close();
            console.log('Database connection closed.');
        }
    }
};

updateDraftField();
