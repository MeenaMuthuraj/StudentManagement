// models/Class.js
const mongoose = require('mongoose');

// Define the schema for an individual material file
const materialSchema = new mongoose.Schema({
    // Mongoose automatically adds _id here, which we'll use for deletion
    originalName: { // Store the original filename for display
        type: String,
        required: true
    },
    path: { // The server path where the file is stored (e.g., /uploads/...)
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    // You could add fileType, size etc. if needed later
    // fileType: String,
    // size: Number
});


// Define the schema for an embedded subject
const subjectSchema = new mongoose.Schema({
    // Mongoose automatically adds _id here, which we'll use to identify subjects
    name: {
        type: String,
        required: true,
        trim: true
    },
    syllabi: [materialSchema],
    materials: [materialSchema] // Array to store multiple material files
});


// Main Class Schema
const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Class name is required.'],
        trim: true,
        // Consider if unique should be per-teacher instead of global
        // unique: true - Removed global unique constraint for flexibility
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Use the updated subjectSchema for the subjects array
    subjects: [subjectSchema], // <-- USE THE UPDATED SCHEMA HERE

}, { timestamps: true });

// Optional: Add an index for faster querying by teacher and name
classSchema.index({ teacher: 1, name: 1 }, { unique: true }); // Unique combination per teacher


module.exports = mongoose.model('Class', classSchema);