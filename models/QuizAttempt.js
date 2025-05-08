// backend/models/QuizAttempt.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Added teacherId for reference
    answers: { type: [answerSchema], required: true },
    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: Date.now, index: true },
    timeTakenSeconds: { type: Number, default: null }
}, { timestamps: true });

// Ensure a student attempts a quiz only once (can be removed if multiple attempts are allowed)
quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
module.exports = QuizAttempt;