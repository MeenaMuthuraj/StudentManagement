// backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    date: {
        type: Date, // Store the date part only (set time to 00:00:00 UTC ideally)
        required: [true, 'Attendance date is required.'],
        // Indexing this field is crucial for querying by date
        index: true,
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class', // Reference to the Class model
        required: [true, 'Class ID is required.'],
        index: true,
    },
    // subject: {
    //     // We reference the main User model for subject ID IF subjects become separate documents.
    //     // For now, storing subject NAME might be simpler if fetched with Class
    //     // Let's assume for now we store the Subject's _id from the Class.subjects array
    //     type: mongoose.Schema.Types.ObjectId,
    //      // No direct 'ref' here as it's an ID within an embedded array in Class
    //     required: [true, 'Subject ID is required.'],
    //     index: true
    // },
    // period: {
    //     type: Number,
    //     required: [true, 'Period number is required.'],
    //     min: [1, 'Period must be between 1 and 8.'], // Example range
    //     max: [8, 'Period must be between 1 and 8.'],
    //     index: true,
    // },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the Student (User model)
        required: [true, 'Student ID is required.'],
        index: true,
    },
    status: {
        type: String,
        required: [true, 'Attendance status is required.'],
        enum: ['present', 'absent', 'late'],
        lowercase: true,
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the Teacher (User model)
        required: [true, 'Teacher ID marking attendance is required.'],
    },
    remark: { // Optional field for notes
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// --- Indexes for Efficient Querying ---

// Unique compound index to prevent duplicate entries for the same student/class/subject/period/date
attendanceSchema.index({ date: 1, class: 1, student: 1 }, { unique: true });

// Additional indexes for common report queries
attendanceSchema.index({ class: 1, date: 1 }); // Find attendance for a class on a specific date range
attendanceSchema.index({ student: 1, class: 1, date: 1 }); // Find a student's attendance in a class


// --- Ensure Date is Stored as Date Only (Start of Day UTC) ---
// This helps ensure querying by date works regardless of timezone issues.
// Run this *before* validating or saving.
// Pre-validation hook for date standardization (Keep this)
attendanceSchema.pre('validate', function(next) {
    if (this.date && this.date instanceof Date) { // Check if it's a date object already
         try {
             const year = this.date.getUTCFullYear();
             const month = this.date.getUTCMonth();
             const day = this.date.getUTCDate();
             this.date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
         } catch (e) { console.error("Error standardizing date:", e); }
     } else if (this.date) { // Attempt conversion if it's not a date obj (e.g., string)
          try {
              const inputDate = new Date(this.date);
              if (!isNaN(inputDate.getTime())) {
                 const year = inputDate.getUTCFullYear();
                 const month = inputDate.getUTCMonth();
                 const day = inputDate.getUTCDate();
                 this.date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
              } else {
                   // Handle case where date string is invalid, maybe let validation fail
                    console.warn("Invalid date string received:", this.date);
               }
          } catch(e){ console.error("Error processing non-Date date field:", e); }
      }
     next();
  });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;