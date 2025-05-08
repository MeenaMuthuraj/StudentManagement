// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // Make sure bcryptjs is required if using pre-save hook for password

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true }, // Added trim
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // Exclude password by default
  userType: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'admin']
  },
  profile: { // Ensure all fields from the StudentEditProfile form are defined here
    // --- Basic Info ---
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullName: String, // Auto-generated
    profilePic: { type: String, default: null }, // Path to profile picture
    phone: { type: String, trim: true },
    dob: Date,
    gender: { type: String, enum: ['', 'Male', 'Female', 'Other'] },

    // --- Contact Info ---
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    zipCode: { type: String, trim: true },

    // --- Student Specific Academic/Other Info ---
    bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    nationality: { type: String, default: 'Indian', trim: true },
    rollNumber: { type: String, sparse: true, trim: true }, // Usually managed by admin/teacher
    admissionDate: Date, // Usually managed by admin/teacher
    currentGrade: String, // Usually managed by admin/teacher
    previousSchool: { type: String, trim: true }, // Student might provide this initially

    // --- Class Preference ---
    requestedClassName: { type: String, trim: true, default: null }, // For student input

    // --- Parent/Guardian Info ---
    fatherName: { type: String, trim: true },
    fatherOccupation: { type: String, trim: true },
    fatherPhone: { type: String, trim: true },
    motherName: { type: String, trim: true },
    motherOccupation: { type: String, trim: true },
    motherPhone: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },

    // --- Medical Info ---
    medicalConditions: { type: String, trim: true },
    allergies: { type: String, trim: true },
    regularMedications: { type: String, trim: true },

    // --- Additional Services ---
    transportRequired: { type: Boolean, default: false },
    transportRoute: { type: String, trim: true },
    hostelRequired: { type: Boolean, default: false },

    // --- Teacher Specific Fields (Should be empty for students) ---
    qualification: String,
    experience: String,
    subjects: String,
    schoolName: String,
    designation: String,
    skills: String,
  },
  // --- Student Enrollment (Managed elsewhere) ---
  enrolledClasses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
  }],
}, { timestamps: true }); // Add timestamps (createdAt, updatedAt)

// --- Mongoose Hooks ---

// Auto-generate/update fullName before saving
userSchema.pre('save', function(next) {
    // Check if firstName or lastName within the profile object was modified
    if (this.isModified('profile.firstName') || this.isModified('profile.lastName')) {
        if (this.profile) { // Ensure profile object exists
            this.profile.fullName = `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
            console.log(`Updated fullName to: ${this.profile.fullName}`);
        }
    }

    // Auto-generate username only if not provided during initial creation
    if (this.isNew && !this.username && this.email) {
        this.username = this.email.split('@')[0];
        // TODO: Consider adding logic for username uniqueness if required
    }
    next();
});


// Add method to compare passwords (optional but good practice, used for login)
userSchema.methods.comparePassword = async function(candidatePassword) {
    // Need to explicitly fetch password field as it's select: false
    const user = await this.constructor.findById(this._id).select('+password');
    if (!user || !user.password) {
         throw new Error("Password field missing for comparison.");
    }
     return bcrypt.compare(candidatePassword, user.password);
};


const User = mongoose.model("User", userSchema);
module.exports = User;