//models/QuizResul.js
const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    quizId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'QuizActivity' },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        questionText: { type: String, required: true },
        userAnswer: { type: String, default: '' },
        isCorrect: { type: Boolean, required: true }
    }],
    score: { type: Number, required: true },
    isLate: { type: Boolean, default: null },
    isSubmitted: { type: Boolean, required: true, default: true }, // Ensures `isSubmitted` is true by default
    submittedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', quizResultSchema);
