// backend/models/Quiz.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswerIndex: { type: Number, required: true, min: 0 },
}, { _id: true }); // Keep question _id

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectName: { type: String, required: true, trim: true }, // Store name
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Ensure this field name is 'teacher'
    questions: {
        type: [questionSchema],
        validate: [val => Array.isArray(val) && val.length > 0, 'Quiz must have at least one question.']
    },
    timeLimitMinutes: { type: Number, min: 1, default: null },
    status: { type: String, enum: ['Draft', 'Published', 'Closed'], default: 'Draft', index: true },
    publishDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
}, { timestamps: true });

quizSchema.index({ teacher: 1, status: 1 });
quizSchema.index({ classId: 1, subjectId: 1, status: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;