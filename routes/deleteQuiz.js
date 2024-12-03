const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ensureAdminLoggedIn } = require('../middleware');
const Quiz = require('../models/QuizActivityRoom');
const QuizResult = require('../models/QuizResult');


// Delete Quiz Route
router.delete('/delete-quiz/:quizId', ensureAdminLoggedIn, async (req, res) => {
    const { quizId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({ success: false, error: 'Invalid quiz ID.' });
        }

        // Delete related quiz results
        await QuizResult.deleteMany({ quizId });

        // Delete the quiz itself
        const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

        if (!deletedQuiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found.' });
        }

        res.status(200).json({ success: true, message: 'Quiz deleted successfully.' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to delete quiz.' });
    }
});

module.exports = router;
