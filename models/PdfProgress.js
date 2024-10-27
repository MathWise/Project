const mongoose = require('mongoose');

const pdfProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    pdfFileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    
    progress: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { timestamps: true });


module.exports = mongoose.model('PdfProgress', pdfProgressSchema);
