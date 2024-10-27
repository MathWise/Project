const mongoose = require('mongoose');

// Choice schema for multiple-choice questions
const choiceSchema = new mongoose.Schema({
    text: { type: String, required: false }, // Only required for multiple-choice questions
    isCorrect: { type: Boolean, required: false } // Only used for multiple-choice
});

// Question schema to support both multiple-choice and fill-in-the-blank
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['multiple-choice', 'fill-in-the-blank'], 
        required: true 
    }, // Determine the question type
    choices: [choiceSchema], // Only used for multiple-choice questions
    correctAnswer: { 
        type: String, 
        required: function() { return this.type === 'fill-in-the-blank'; } 
    } // Only required for fill-in-the-blank questions
});

// Validation to ensure correct structure depending on question type
questionSchema.pre('save', function (next) {
    if (this.type === 'multiple-choice') {
        // Ensure each multiple-choice question has at least one correct choice
        if (!this.choices.some(choice => choice.isCorrect)) {
            return next(new Error('Each multiple-choice question must have at least one correct choice.'));
        }
    }
    if (this.type === 'fill-in-the-blank') {
        // Ensure fill-in-the-blank questions have a correct answer
        if (!this.correctAnswer || this.correctAnswer.trim() === '') {
            return next(new Error('Fill-in-the-blank questions must have a correct answer.'));
        }
    }
    next();
});

// Quiz schema to store a list of questions
const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    questions: [questionSchema]
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
