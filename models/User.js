// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // Make sure bcryptjs is required if using pre-save hook for password

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }, // Consider making unique: true later
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }, // Added lowercase and trim
  password: { type: String, required: true, select: false }, // Exclude password by default
  userType: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'admin'] // Define allowed types
  },
  profile: {
    // --- Common Fields ---
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullName: String, // Auto-generated
    profilePic: { type: String, default: null },
    phone: { type: String, trim: true },
    dob: Date,
    gender: { type: String, enum: ['', 'Male', 'Female', 'Other'] }, // Added '' for initial empty selection
    address: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    zipCode: String,

    // --- Student Specific Fields (or general if applicable) ---
    bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }, // Enum added
    nationality: { type: String, default: 'Indian' },
    rollNumber: { type: String, sparse: true, trim: true }, // Make unique per school/system later if needed, sparse allows multiple nulls
    admissionDate: Date,
    currentGrade: String, // Or consider Class reference later
    previousSchool: String,
    fatherName: String,
    fatherOccupation: String,
    fatherPhone: String,
    motherName: String,
    motherOccupation: String,
    motherPhone: String,
    guardianName: String,
    guardianRelation: String,
    guardianPhone: String,
    medicalConditions: String,
    allergies: String,
    regularMedications: String,
    transportRequired: { type: Boolean, default: false },
    transportRoute: String,
    hostelRequired: { type: Boolean, default: false },

    // --- FIELD ADDED FOR STUDENT TO ENTER CLASS PREFERENCE ---
    requestedClassName: { type: String, trim: true, default: null },
    // ---------------------------------------------------------

    // --- Teacher Specific Fields ---
    qualification: String,
    experience: String, // Or Number
    subjects: String, // Likely better managed via Class schema
    schoolName: String,
    designation: String,
    skills: String,

  },
  // --- Student Enrollment (Managed by Admin/Process) ---
  enrolledClasses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }); // Added timestamps

// Auto-generate fullName before saving
userSchema.pre('save', function(next) {
    let nameChanged = false;
    if (this.isModified('profile.firstName') || this.isNew && this.profile?.firstName) {
        nameChanged = true;
    }
    if (this.isModified('profile.lastName') || this.isNew && this.profile?.lastName) {
         nameChanged = true;
    }

    if (nameChanged && this.profile) { // Ensure profile exists
        this.profile.fullName = `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
    }

    // Auto-generate username only if not provided during initial creation
     if (this.isNew && !this.username && this.email) {
          this.username = this.email.split('@')[0];
          // TODO: Add logic to ensure username uniqueness if necessary
      }
    next();
});


// Add method to compare passwords (optional but good practice)
userSchema.methods.comparePassword = async function(candidatePassword) {
    // Fetch password explicitly as it's selected: false
    const user = await this.constructor.findById(this._id).select('+password');
    if (!user || !user.password) {
         throw new Error("Password field missing for comparison."); // Should not happen if required
    }
     return bcrypt.compare(candidatePassword, user.password);
};


const User = mongoose.model("User", userSchema);
module.exports = User;