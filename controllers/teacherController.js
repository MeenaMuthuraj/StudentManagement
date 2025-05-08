// backend/controllers/teacherController.js

const User = require('../models/User'); // Use the correct User model
const Class = require('../models/Class');
const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken'); // Not needed in this controller directly
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // File System module
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Quiz = require('../models/Quiz');   // <-- NEW: Import Quiz model
const QuizAttempt = require('../models/QuizAttempt');
// --- Multer Configuration (Keep As Is) ---
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)){ /* ... create dir ... */ } else { /* ... log found ... */ }
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    if (!req.user || !req.user.userId) return cb(new Error("User ID missing for filename")); // Add check
    const uniqueSuffix = `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    req.fileValidationError = 'Only image files (jpg, jpeg, png, gif) are allowed!';
    return cb(new Error('Invalid file type'), false);
  }
  cb(null, true);
};
const uploadImage = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});


// --- *** NEW: Multer instance for General Files (Syllabus, Materials) *** ---
const documentFileFilter = (req, file, cb) => {
    // Define allowed document types (customize as needed)
    const allowedTypes = /\.(pdf|doc|docx|txt|ppt|pptx|xls|xlsx)$/i;
    if (!file.originalname.match(allowedTypes)) {
         req.fileValidationError = 'Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX';
         return cb(new Error('Invalid document file type'), false);
    }
    cb(null, true); // Accept the file
};

const uploadDocument = multer({ // CREATE a new instance
    storage: storage, // Use the same storage logic
    fileFilter: documentFileFilter, // Use the document-specific filter
    limits: { fileSize: 10 * 1024 * 1024 } // Example: Allow larger files (10MB)
});
// --- *** END NEW Multer Instance *** ---


// --- Controller Functions ---

/**
 * @desc    Get FULL teacher profile data (excluding password)
 * @route   GET /api/teacher/profile
 * @access  Private
 * @body    { studentData: { ...formData }, classId: '...' }
 */
// const  addStudentToClass = async (req, res) => {

//     const { studentData, classId } = req.body; // Destructure payload
//     const teacherId = req.user.userId;

//     // --- Basic Input Validation ---
//     if (!studentData || typeof studentData !== 'object' || Object.keys(studentData).length === 0) {
//         return res.status(400).json({ message: "Student data is missing or invalid." });
//     }
//     if (!classId) {
//          return res.status(400).json({ message: "Target Class ID ('classId') is required." });
//     }
//     // Check required fields from frontend form (ensure password is included)
//     const requiredFields = ['firstName', 'lastName', 'email', 'password', 'rollNumber', 'admissionDate', 'currentGrade', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone', 'dob', 'gender', 'phone', 'address', 'city', 'state', 'zipCode'];
//     for (const field of requiredFields) {
//         if (!studentData[field] && typeof studentData[field] !== 'boolean') {
//             return res.status(400).json({ message: `Missing required field: ${field}` }); // <<< Potential Cause
//         }
//     }
//     // Add specific format checks if needed (e.g., email regex)

//     try {
//         console.log("--- Received Student Data:", studentData);
//         console.log("--- Target Class ID:", classId);

//         // 1. Verify Target Class Exists and Belongs to Teacher
//         const targetClass = await Class.findOne({ _id: classId, teacher: teacherId });
//         if (!targetClass) {
//             console.warn(`Class ${classId} not found or not managed by teacher ${teacherId}`);
//             return res.status(404).json({ message: "Target class not found or access denied." });
//         }

//         // 2. Check for Existing User (Email)
//         const existingUser = await User.findOne({ email: studentData.email.toLowerCase() });
//         if (existingUser) {
//             return res.status(400).json({ message: `Email ${studentData.email} is already registered.` }); // <<< Potential Cause
//         }

//         // 3. Check for Existing Roll Number (assuming globally unique for students)
//         const existingRoll = await User.findOne({ 'profile.rollNumber': studentData.rollNumber, userType: 'student' });
//         if (existingRoll) {
//             return res.status(400).json({ message: `Roll number ${studentData.rollNumber} is already assigned.` }); // <<< Potential Cause
//         }


//         // 4. Hash the Student's Password
//         const hashedPassword = await bcrypt.hash(studentData.password, 10);

//         // 5. Prepare Student Document
//         const newStudent = new User({
//             username: studentData.email.split('@')[0], // Default username from email
//             email: studentData.email.toLowerCase(),
//             password: hashedPassword,
//             userType: 'student', // Set user type explicitly
//             profile: {
//                 // Map all fields from studentData
//                 firstName: studentData.firstName,
//                 lastName: studentData.lastName,
//                 phone: studentData.phone,
//                 dob: studentData.dob, // Use correct field name from form
//                 gender: studentData.gender,
//                 bloodGroup: studentData.bloodGroup,
//                 nationality: studentData.nationality,
//                 address: studentData.address,
//                 city: studentData.city,
//                 state: studentData.state,
//                 zipCode: studentData.zipCode,
//                 rollNumber: studentData.rollNumber,
//                 admissionDate: studentData.admissionDate,
//                 currentGrade: studentData.currentGrade,
//                 previousSchool: studentData.previousSchool,
//                 fatherName: studentData.fatherName,
//                 fatherOccupation: studentData.fatherOccupation,
//                 fatherPhone: studentData.fatherPhone,
//                 motherName: studentData.motherName,
//                 motherOccupation: studentData.motherOccupation,
//                 motherPhone: studentData.motherPhone,
//                 guardianName: studentData.guardianName,
//             guardianRelation: studentData.guardianRelation,
//             guardianPhone: studentData.guardianPhone,
//                 medicalConditions: studentData.medicalConditions,
//                 allergies: studentData.allergies,
//                 regularMedications: studentData.regularMedications,
//                 transportRequired: studentData.transportRequired,
//                 transportRoute: studentData.transportRequired ? studentData.transportRoute : '',
//                 hostelRequired: studentData.hostelRequired,
//             },
//             enrolledClasses: [classId] // Add initial class enrollment
//         });

//         // 6. Save the New Student
//         const savedStudent = await newStudent.save();
//         console.log("<--- Student user created successfully:", savedStudent._id);
//             // --- ADD THIS LOG ---
//     console.log("--- Attempting to save this student object:", JSON.stringify(newStudent.toObject(), null, 2));
//     // --------------------

//         // 7. Add Student ID to the Class's students array
//         // Use $addToSet to prevent duplicates if this logic runs multiple times somehow
//         await Class.updateOne(
//             { _id: classId },
//             { $addToSet: { students: savedStudent._id } }
//         );
//         console.log(`<--- Student ${savedStudent._id} reference added to Class ${classId}`);

//         // 8. Send Success Response
//         res.status(201).json({
//             success: true,
//             message: 'Student registered and added to class successfully.',
//             studentId: savedStudent._id,
//             // You might want to return the created student object (excluding password)
//             // student: { _id: savedStudent._id, ...savedStudent.profile, email: savedStudent.email }
//         });

//     } catch (error) {
//         console.error("!!! Error in  addStudentToClass:", error);
//         // Handle Mongoose Validation Errors
//         if (error.name === 'ValidationError') {
//             const messages = Object.values(error.errors).map(e => e.message).join('. ');
//             return res.status(400).json({ message: `Validation Error: ${messages}` }); // <<< Potential Cause
//        }
//          // Handle Duplicate Key Errors (e.g., email, rollNumber, username)
//          if (error.code === 11000) {
//               let field = Object.keys(error.keyValue)[0];
//               if (field === 'profile.rollNumber') field = 'Roll Number';
//               if (field === 'email') field = 'Email';
//               if (field === 'username') field = 'Username'; // If username is generated and fails
//               return res.status(400).json({ message: `${field} "${error.keyValue[field]}" is already in use.` });
//          }
//         // Generic Server Error
//         res.status(500).json({ message: 'Server error while adding student.' });
//     }
// };
// --- *** END NEW CONTROLLER FUNCTION *** ---
const getTeacherProfile = async (req, res) => {
  console.log(`---> GET /api/teacher/profile for User ID: ${req.user?.userId}`);
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ message: "Authentication error: User ID missing" });

    // --- MODIFIED: Return the full user object except password ---
    const userProfile = await User.findById(userId).select('-password');

    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    console.log(`<--- Sending full user profile for User ID: ${userId}`);
    res.status(200).json(userProfile); // Send the whole object

  } catch (error) {
    console.error("!!! Error in getTeacherProfile:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

/**
 * @desc    Update teacher profile TEXT data (profile subdocument)
 * @route   PUT /api/teacher/profile
 * @access  Private
 */
const updateTeacherProfile = async (req, res) => {
   console.log(`---> PUT /api/teacher/profile for User ID: ${req.user?.userId}`);
   try {
      const userId = req.user.userId;
      if (!userId) return res.status(401).json({ message: "Authentication error: User ID missing" });

      // req.body should ONLY contain fields for the 'profile' subdocument
      const profileDataFromFrontend = req.body;
      console.log("---> Received profile data for update:", JSON.stringify(profileDataFromFrontend, null, 2));

      if (typeof profileDataFromFrontend !== 'object' || profileDataFromFrontend === null || Array.isArray(profileDataFromFrontend)) {
          return res.status(400).json({ message: "Invalid profile data format. Expected an object." });
      }

      // Find user and update ONLY the 'profile' subdocument
      // Mongoose validation defined in User.js for the profile object will run
      const updatedUser = await User.findByIdAndUpdate(
         userId,
         // $set merges provided fields into the existing profile object
         { $set: { profile: profileDataFromFrontend } },
         { new: true, runValidators: true, context: 'query' }
      ).select('profile'); // Select only the profile subdocument to return

      if (!updatedUser) {
         return res.status(404).json({ message: 'User not found, update failed.' });
      }

      console.log("<--- Successfully updated profile subdocument:", JSON.stringify(updatedUser.profile, null, 2));
      // Return ONLY the updated profile subdocument, as expected by frontend
      res.status(200).json(updatedUser.profile);

   } catch (error) {
      console.error("!!! Error updating teacher profile:", error);
      if (error.name === 'ValidationError') {
         const messages = Object.values(error.errors).map(e => e.message).join('. ');
         return res.status(400).json({ message: `Validation Error: ${messages}`, errors: error.errors });
      }
      res.status(500).json({ message: "Server error updating profile" });
   }
};

/**
 * @desc    Upload/Update teacher profile image
 * @route   POST /api/teacher/profile/image
 * @access  Private
 */
const uploadProfileImage = async (req, res) => {
    console.log(`---> POST /api/teacher/profile/image for User ID: ${req.user?.userId}`);
    try {
      const userId = req.user.userId;
       if (!userId) return res.status(401).json({ message: "Authentication error: User ID missing" });

      // Check Multer validation errors
      if (req.fileValidationError) {
         console.warn(`!!! File validation error: ${req.fileValidationError}`);
        return res.status(400).json({ message: req.fileValidationError });
      }
      if (!req.file) {
         console.warn(`!!! No file uploaded or rejected by filter.`);
        return res.status(400).json({ message: 'No valid image file uploaded. Ensure field name is "profileImage" and type is allowed.' });
      }

      // --- Get existing path IF NEEDED for deleting old file ---
       const existingUser = await User.findById(userId).select('profile.profilePic');
       const oldImagePath = existingUser?.profile?.profilePic;

      // Construct the web-accessible URL path for the new image
      const newFilePath = `/uploads/${req.file.filename}`; // Matches server.js static route
      console.log(`--- New image path generated: ${newFilePath}`);

      // Find user and update ONLY the 'profilePic' field within 'profile'
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { 'profile.profilePic': newFilePath } }, // Dot notation for nested update
        { new: true, runValidators: true } // runValidators might be relevant if path has rules
      ).select('profile.profilePic'); // Select only the updated field

      if (!updatedUser || !updatedUser.profile) {
         console.error(`!!! Failed to update profilePic path in DB for User ID: ${userId}.`);
         // Attempt to delete the NEWLY uploaded file if DB update fails
         fs.unlink(path.join(uploadDir, req.file.filename), (err) => {
             if (err) console.error(`Error deleting orphaned new file ${req.file.filename}:`, err);
             else console.log(`Deleted orphaned new file ${req.file.filename} due to DB update failure.`);
         });
         return res.status(500).json({ message: 'Failed to update profile picture path in database.' });
      }

      console.log("<--- Successfully updated profile image path in DB:", updatedUser.profile.profilePic);

      // --- Delete the OLD image file AFTER successful DB update ---
      if (oldImagePath && oldImagePath !== newFilePath && oldImagePath.startsWith('/uploads/')) {
            const oldFilename = path.basename(oldImagePath);
            const absoluteOldPath = path.join(uploadDir, oldFilename);
             console.log(`--- Attempting to delete old image file: ${absoluteOldPath}`);
             fs.unlink(absoluteOldPath, (err) => {
                 if (err && err.code !== 'ENOENT') { // Ignore "file not found" errors
                      console.error(`Error deleting old file ${absoluteOldPath}:`, err);
                 } else if (!err) {
                      console.log(`--- Successfully deleted old file: ${absoluteOldPath}`);
                 }
             });
      }

      // Send back the NEW web-accessible path
      res.status(200).json({ profilePic: newFilePath }); // Matches frontend expectation

    } catch (error) {
      console.error("!!! Error uploading profile image:", error);
       // Attempt to delete the uploaded file if an error occurred after upload
       if (req.file?.filename) {
           fs.unlink(path.join(uploadDir, req.file.filename), (err) => { /* handle cleanup error */ });
       }
      res.status(500).json({ message: 'Server error uploading image' });
    }
};


/**
 * @desc    Remove teacher profile image (sets path to null, deletes file)
 * @route   DELETE /api/teacher/profile/image
 * @access  Private
 */
const deleteProfileImage = async (req, res) => {
    console.log(`---> DELETE /api/teacher/profile/image for User ID: ${req.user?.userId}`);
    try {
        const userId = req.user.userId;
        if (!userId) return res.status(401).json({ message: "Authentication error: User ID missing" });

        // Find user to get the current image path *before* updating DB
        const user = await User.findById(userId).select('profile.profilePic');
        if (!user) {
            // If user not found, the goal (no image linked) is effectively met
            return res.status(200).json({ success: true, message: 'User not found, image link already removed.' });
        }

        const currentImagePath = user.profile?.profilePic;
        console.log(`--- Current profilePic path found in DB: ${currentImagePath}`);

        // --- Update DB: Set profilePic to null ---
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { 'profile.profilePic': null } }, // Set path to null
            { new: true } // Not strictly needed here unless checking result
        );

        if (!updatedUser) {
             console.error(`!!! Failed to update DB to remove image path for User ID: ${userId}.`);
             return res.status(500).json({ message: 'Database update failed while removing image link.' });
        }
        console.log("<--- Successfully updated DB, profilePic set to null.");

        // --- Delete the actual file from the filesystem if path exists ---
        if (currentImagePath && currentImagePath.startsWith('/uploads/')) {
            const filename = path.basename(currentImagePath);
            const absolutePathToDelete = path.join(uploadDir, filename);
            console.log(`--- Attempting to delete file from server: ${absolutePathToDelete}`);
            fs.unlink(absolutePathToDelete, (err) => {
                if (err && err.code !== 'ENOENT') { // Log error unless it's "file not found"
                    console.error(`!!! Error deleting file ${absolutePathToDelete}:`, err);
                } else if (!err) {
                    console.log(`--- Successfully deleted file: ${absolutePathToDelete}`);
                } else {
                    console.log(`--- File ${absolutePathToDelete} not found, likely already deleted.`);
                }
            });
        } else {
             console.log("--- No valid current image path found, skipping file deletion.");
        }

        res.status(200).json({ success: true, message: 'Profile image removed successfully' });

    } catch (error) {
        console.error(`!!! Error removing profile image for User ID ${req.user?.userId}:`, error);
        res.status(500).json({ message: 'Server error removing image' });
    }
};

/**
 * @desc    Change teacher password
 * @route   POST /api/teacher/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
    console.log(`---> POST /api/teacher/change-password for User ID: ${req.user?.userId}`);
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
       if (!userId) return res.status(401).json({ message: "Authentication error: User ID missing" });

      // Validation
      if (!currentPassword || !newPassword) {
         return res.status(400).json({ message: 'Please provide both current and new passwords' });
      }
      if (newPassword.length < 6) {
         return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }
      if (currentPassword === newPassword) {
          return res.status(400).json({ message: 'New password cannot be the same as the current one' });
      }

      // Find user, select password explicitly
      const user = await User.findById(userId).select('+password');
      if (!user) {
         return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
         return res.status(400).json({ message: 'Incorrect current password' });
      }

      // Hash and save new password
      user.password = await bcrypt.hash(newPassword, 10); // Use salt rounds 10-12
      await user.save(); // Mongoose pre-save hooks (if any) will run

      console.log(`<--- Password changed successfully for User ID: ${userId}`);
      // Send success response - frontend will handle clearing fields/token
      res.status(200).json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
      console.error("!!! Error changing password:", error);
      res.status(500).json({ message: 'Server error changing password' });
    }
};


// --- *** NEW CLASS MANAGEMENT CONTROLLERS *** ---

/**
 * @desc    Get classes managed by the logged-in teacher
 * @route   GET /api/teacher/classes
 * @access  Private (Teacher)
 */
const getTeacherClasses = async (req, res) => {
    console.log(`---> GET /api/teacher/classes for Teacher ID: ${req.user?.userId}`);
    try {
        const teacherId = req.user.userId;
        if (!teacherId) return res.status(401).json({ message: "Authentication error" });

        // Find classes where the teacher field matches the logged-in user's ID
        const classes = await Class.find({ teacher: teacherId })
                                  .sort({ name: 1 }) // Sort alphabetically by name
                                  .populate('students', 'profile.fullName email'); // Optionally populate basic student info if needed immediately

        res.status(200).json(classes);

    } catch (error) {
        console.error("!!! Error fetching teacher classes:", error);
        res.status(500).json({ message: "Server error fetching classes." });
    }
};

/**
 * @desc    Create a new class for the logged-in teacher
 * @route   POST /api/teacher/classes
 * @access  Private (Teacher)
 * @body    { name: 'Class Name' }
 */
const createTeacherClass = async (req, res) => {
    console.log(`---> POST /api/teacher/classes by Teacher ID: ${req.user?.userId}`);
    const { name } = req.body;
    const teacherId = req.user.userId;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Class name is required." });
    }
     if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
         // Optional: Check if teacher already has a class with the same name
         const existingClass = await Class.findOne({ name: name.trim(), teacher: teacherId });
         if (existingClass) {
             return res.status(400).json({ message: `You already have a class named "${name.trim()}".` });
         }

         const newClass = new Class({
             name: name.trim(),
             teacher: teacherId,
             students: [], // Initialize empty arrays
             subjects: []
         });

         const savedClass = await newClass.save();
         console.log("<--- Class created successfully:", savedClass._id);
         res.status(201).json(savedClass); // Return the full new class object

    } catch (error) {
         console.error("!!! Error creating class:", error);
          if (error.name === 'ValidationError') {
              const messages = Object.values(error.errors).map(e => e.message).join('. ');
              return res.status(400).json({ message: `Validation Error: ${messages}` });
          }
           // Handle potential unique index error if name is globally unique in schema
          if (error.code === 11000) {
              return res.status(400).json({ message: `Class name "${name.trim()}" is already taken.` });
          }
         res.status(500).json({ message: "Server error creating class." });
    }
};

/**
 * @desc    Update a class name
 * @route   PUT /api/teacher/classes/:classId
 * @access  Private (Teacher)
 * @body    { name: 'Updated Class Name' }
 */
const updateTeacherClass = async (req, res) => {
    const { classId } = req.params;
    const { name } = req.body;
    const teacherId = req.user.userId;
     console.log(`---> PUT /api/teacher/classes/${classId} by Teacher ID: ${teacherId}`);

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "New class name is required." });
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
         return res.status(400).json({ message: 'Invalid Class ID format.' });
    }
     if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
         // Optional: Check for duplicate name among other classes of the same teacher
         const existingClass = await Class.findOne({
             name: name.trim(),
             teacher: teacherId,
             _id: { $ne: classId } // Exclude the current class being updated
          });
         if (existingClass) {
             return res.status(400).json({ message: `You already have another class named "${name.trim()}".` });
         }

         const updatedClass = await Class.findOneAndUpdate(
             { _id: classId, teacher: teacherId }, // Find class by ID and ensure it belongs to the teacher
             { $set: { name: name.trim() } },
             { new: true, runValidators: true } // Return updated doc, run schema validators
         );

         if (!updatedClass) {
             return res.status(404).json({ message: "Class not found or you don't have permission to edit it." });
         }

         console.log("<--- Class updated successfully:", updatedClass._id);
         res.status(200).json(updatedClass);

    } catch (error) {
         console.error(`!!! Error updating class ${classId}:`, error);
          if (error.name === 'ValidationError') { /* ... validation error handling ... */ }
          if (error.code === 11000) { /* ... duplicate key error handling ... */ }
         res.status(500).json({ message: "Server error updating class." });
    }
};

/**
 * @desc    Delete a class
 * @route   DELETE /api/teacher/classes/:classId
 * @access  Private (Teacher)
 */
const deleteTeacherClass = async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;
     console.log(`---> DELETE /api/teacher/classes/${classId} by Teacher ID: ${teacherId}`);

    if (!mongoose.Types.ObjectId.isValid(classId)) {
         return res.status(400).json({ message: 'Invalid Class ID format.' });
    }
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
         // Find the class first to ensure it belongs to the teacher
         const classToDelete = await Class.findOne({ _id: classId, teacher: teacherId });
         if (!classToDelete) {
             return res.status(404).json({ message: "Class not found or you don't have permission to delete it." });
         }

          // TODO: Decide on cascading deletes or handling enrolled students/subjects
          // Option 1: Just delete the class reference (students/subjects remain orphaned in their collections)
          // Option 2: Remove class reference from all enrolled students
          if (classToDelete.students && classToDelete.students.length > 0) {
              await User.updateMany(
                  { _id: { $in: classToDelete.students } },
                  { $pull: { enrolledClasses: classId } }
              );
              console.log(`--- Removed class reference ${classId} from ${classToDelete.students.length} students.`);
          }
          // Option 3: Delete associated subjects if they only exist within this class context

         // Delete the class document itself
         await Class.deleteOne({ _id: classId, teacher: teacherId }); // Double check teacher again

         console.log("<--- Class deleted successfully:", classId);
         res.status(200).json({ success: true, message: 'Class deleted successfully.' });

    } catch (error) {
         console.error(`!!! Error deleting class ${classId}:`, error);
         res.status(500).json({ message: "Server error deleting class." });
    }
};

/**
 * @desc    Get students for a specific class (INCLUDES officially enrolled AND those requesting this class name)
 * @route   GET /api/teacher/classes/:classId/students
 * @access  Private (Teacher)
 */
const getStudentsForClass = async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> GET /api/teacher/classes/${classId}/students by Teacher ID: ${teacherId} (Including requesters)`);

     if (!mongoose.Types.ObjectId.isValid(classId)) { return res.status(400).json({ message: 'Invalid Class ID' }); }
     if (!teacherId) { return res.status(401).json({ message: "Authentication error" }); }

    try {
        // 1. Find the target class to verify teacher ownership AND get the class name
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherId }).select('name students'); // Get name and enrolled students array

        if (!targetClass) {
            return res.status(404).json({ message: "Class not found or access denied." });
        }
        const targetClassName = targetClass.name; // Get the name for matching requests
        const officiallyEnrolledIds = targetClass.students || []; // Array of ObjectIds

        // 2. Find students whose 'requestedClassName' matches this class's name
        // Ensure we only select students! Exclude teacher/admin accounts with same name request?
         const requestingStudents = await User.find({
             userType: 'student',
            'profile.requestedClassName': targetClassName
          }).select('email profile.firstName profile.lastName profile.fullName profile.phone'); // Select needed fields

        // 3. Find students who are OFFICIALLY enrolled (using the ID array)
        // Ensure we don't fetch students who are already included in the requesting list
        // unless absolutely necessary - this depends if profile update clears requestedClassName
         const officiallyEnrolledStudents = await User.find({
             _id: { $in: officiallyEnrolledIds }
            // userType: 'student' // Implicit because they are in the Class.students array
          }).select('email profile.firstName profile.lastName profile.fullName profile.phone'); // Select needed fields


        // 4. Combine and Deduplicate the lists
        const combinedMap = new Map();
        // Add officially enrolled first
        officiallyEnrolledStudents.forEach(student => combinedMap.set(student._id.toString(), student));
         // Add requesting students, potentially overwriting (or adding if not already there)
         // Be careful if profile data differs slightly between the two queries
         requestingStudents.forEach(student => combinedMap.set(student._id.toString(), student));

        const combinedStudents = Array.from(combinedMap.values());


        console.log(`<--- Found ${combinedStudents.length} total students (enrolled + requesting) for class ${targetClassName} (${classId})`);
        res.status(200).json(combinedStudents || []); // Return the combined, deduplicated array

    } catch (error) {
         console.error(`!!! Error fetching students for class ${classId} (combined):`, error);
         res.status(500).json({ message: "Server error fetching students." });
    }
};


 /**
 * @desc    Remove a student from a specific class
 * @route   DELETE /api/teacher/classes/:classId/students/:studentId
 * @access  Private (Teacher)
 */
const deleteStudentFromClass = async (req, res) => {
    const { classId, studentId } = req.params;
    const teacherId = req.user.userId;
     console.log(`---> DELETE /api/teacher/classes/${classId}/students/${studentId} by Teacher ID: ${teacherId}`);

    if (!mongoose.Types.ObjectId.isValid(classId)) { return res.status(400).json({ message: 'Invalid Class ID' }); }
    if (!mongoose.Types.ObjectId.isValid(studentId)) { return res.status(400).json({ message: 'Invalid Student ID' }); }
     if (!teacherId) { return res.status(401).json({ message: "Authentication error" }); }

    try {
        // 1. Verify the teacher owns the class
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherId });
        if (!targetClass) {
            return res.status(404).json({ message: "Class not found or access denied." });
        }

         // 2. Remove student ID from the class's students array
        const updateClassResult = await Class.updateOne(
             { _id: classId },
             { $pull: { students: studentId } } // $pull removes item from array
        );

         if (updateClassResult.modifiedCount === 0) {
              console.warn(`--- Student ${studentId} might not have been in class ${classId} or update failed.`);
              // Decide if this is an error or just info
              // return res.status(404).json({ message: "Student not found in this class." });
         }

          // 3. Remove the class ID from the student's enrolledClasses array
         const updateUserResult = await User.updateOne(
              { _id: studentId },
              { $pull: { enrolledClasses: classId } }
         );
          if (updateUserResult.modifiedCount === 0) {
              console.warn(`--- Class ${classId} might not have been in student ${studentId}'s enrolled list.`);
          }


         console.log(`<--- Student ${studentId} removed from Class ${classId}`);
         res.status(200).json({ success: true, message: 'Student removed from class successfully.' });

    } catch (error) {
         console.error(`!!! Error removing student ${studentId} from class ${classId}:`, error);
         res.status(500).json({ message: "Server error removing student." });
    }
};

/**
 * @desc    Add a new subject to a specific class
 * @route   POST /api/teacher/classes/:classId/subjects
 * @access  Private (Teacher)
 * @body    { name: 'Subject Name' }
 */
const addSubjectToClass = async (req, res) => {
    const { classId } = req.params;
    const { name } = req.body;
    const teacherId = req.user.userId;
    console.log(`---> POST /api/teacher/classes/${classId}/subjects by Teacher ID: ${teacherId}`);
    console.log(`--- Request body:`, req.body); // Log the request body

    // --- Basic Input Validation ---
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Subject name is required." });
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Invalid Class ID format.' });
    }
    if (!teacherId) {
        // This should be caught by authMiddleware, but double-check
        return res.status(401).json({ message: "Authentication error: User ID missing" });
    }

    const subjectNameTrimmed = name.trim(); // Use trimmed name for checks and saving

    try {
        // 1. Find the Class and verify ownership
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherId });

        if (!targetClass) {
            console.warn(`!!! Class ${classId} not found or not owned by teacher ${teacherId}`);
            return res.status(404).json({ message: "Class not found or access denied." });
        }

        // 2. Check if subject name already exists (case-insensitive) in this class
        const subjectExists = targetClass.subjects.some(
            (subject) => subject.name.toLowerCase() === subjectNameTrimmed.toLowerCase()
        );

        if (subjectExists) {
            console.warn(`!!! Subject "${subjectNameTrimmed}" already exists in class ${classId}`);
            return res.status(400).json({ message: `Subject "${subjectNameTrimmed}" already exists in this class.` });
        }

        // 3. Add the new subject to the array
        // We use $push here because we've already done the uniqueness check.
        // $addToSet is also an option for extra safety against race conditions.
        const newSubjectData = { name: subjectNameTrimmed }; // Create the object to push
        const updateResult = await Class.updateOne(
            { _id: classId, teacher: teacherId }, // Ensure we're still targeting the correct class
            { $push: { subjects: newSubjectData } }
        );

        if (updateResult.modifiedCount === 0) {
             console.error(`!!! Failed to add subject to class ${classId} in DB. Update returned 0 modified count.`);
             // This could happen if the class was deleted between the findOne and updateOne calls, though unlikely.
             return res.status(500).json({ message: "Failed to update class with new subject." });
        }

        console.log(`<--- Subject "${subjectNameTrimmed}" added successfully to Class ${classId}`);

        // 4. Fetch the newly added subject to get its _id (Mongoose adds it automatically)
        const updatedClass = await Class.findById(classId).select('subjects'); // Fetch updated subjects array
        const addedSubject = updatedClass.subjects.find(s => s.name === subjectNameTrimmed); // Find the one we just added

        // 5. Send Success Response including the new subject with its ID
        res.status(201).json({
             success: true,
             message: 'Subject added successfully.',
             subject: addedSubject // Send back the newly added subject object {_id, name}
         });

    } catch (error) {
        console.error(`!!! Error adding subject to class ${classId}:`, error);
        // Handle potential validation errors if subject schema becomes more complex
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(e => e.message).join('. ');
             return res.status(400).json({ message: `Validation Error: ${messages}` });
        }
        res.status(500).json({ message: "Server error adding subject." });
    }
};


/**
 * @desc    Get subjects for a specific class
 * @route   GET /api/teacher/classes/:classId/subjects
 * @access  Private (Teacher)
 */
const getSubjectsForClass = async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> GET /api/teacher/classes/${classId}/subjects by Teacher ID: ${teacherId}`);

    // --- Basic Input Validation ---
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Invalid Class ID format.' });
    }
    if (!teacherId) {
        return res.status(401).json({ message: "Authentication error: User ID missing" });
    }

    try {
        // 1. Find the Class and verify ownership, select only the subjects field
        const targetClass = await Class.findOne(
                { _id: classId, teacher: teacherId }
            )
            .select('subjects') // Only retrieve the subjects array
            .sort({'subjects.name': 1}); // Optionally sort subjects by name directly in the query if needed often

        if (!targetClass) {
            console.warn(`!!! Class ${classId} not found or not owned by teacher ${teacherId}`);
            // Return 404 specifically for this case
            return res.status(404).json({ message: "Class not found or access denied." });
        }

        console.log(`<--- Found ${targetClass.subjects?.length || 0} subjects for Class ${classId}`);

        // 2. Return the subjects array (could be empty)
        // Mongoose returns the document, so access the subjects property.
        // Sort here if not done in query, ensures consistent order for frontend.
        const sortedSubjects = targetClass.subjects?.sort((a, b) => a.name.localeCompare(b.name)) || [];
        res.status(200).json(sortedSubjects);

    } catch (error) {
        console.error(`!!! Error fetching subjects for class ${classId}:`, error);
        res.status(500).json({ message: "Server error fetching subjects." });
    }
};

 
// --- Material Management Controllers ---

/**
 * @desc    Upload a material file for a specific subject in a class
 * @route   POST /api/teacher/classes/:classId/subjects/:subjectId/materials
 * @access  Private (Teacher)
 * @body    FormData with file field named 'materialFile'
 */
const uploadMaterial = async (req, res) => {
    const { classId, subjectId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> POST Material Upload for Class: ${classId}, Subject: ${subjectId} by Teacher: ${teacherId}`);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!req.file) return res.status(400).json({ message: 'No material file uploaded. Field name must be "materialFile".' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    const newFilePath = `/uploads/${req.file.filename}`;
    const originalName = req.file.originalname;

    try {
        // 1. Prepare the new material object
        const newMaterial = {
            originalName: originalName,
            path: newFilePath,
            uploadedAt: new Date()
            // Mongoose will auto-generate _id when pushed
        };

        // 2. Find the class, verify ownership, and push the new material to the correct subject's array
        const updateResult = await Class.updateOne(
            { _id: classId, teacher: teacherId, 'subjects._id': subjectId }, // Match class, teacher, AND subject ID
            { $push: { 'subjects.$.materials': newMaterial } } // Use $ positional operator to push into the matched subject's materials
        );

        if (updateResult.matchedCount === 0) {
            // Class or subject not found, or teacher doesn't own it
            fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up material file:", err); });
            return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }
        if (updateResult.modifiedCount === 0) {
             // Should not happen with $push unless there's a weird conflict
             fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up material file:", err); });
             console.error(`!!! Failed to push material to Subject ${subjectId}. Update query returned modifiedCount 0.`);
             return res.status(500).json({ message: "Failed to update materials list in database." });
        }


        console.log(`<--- Material "${originalName}" added successfully to Subject ${subjectId} in Class ${classId}`);

        // 3. Fetch the newly added material to return it with its _id
        // This is slightly less efficient but ensures we return the ID generated by MongoDB
        const updatedClass = await Class.findOne(
            { _id: classId, 'subjects._id': subjectId },
            { 'subjects.$': 1 }
        );
        const addedMaterial = updatedClass?.subjects[0]?.materials?.find(m => m.path === newFilePath);


        // 4. Send Success Response
        res.status(201).json({
            success: true,
            message: 'Material uploaded successfully.',
            material: addedMaterial // Return the newly added material object including its _id
        });

    } catch (error) {
        console.error(`!!! Error uploading material for Subject ${subjectId}:`, error);
        // Clean up the uploaded file if an error occurred
        fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up new material file on error:", err); });
        res.status(500).json({ message: "Server error uploading material." });
    }
};

/**
 * @desc    Get all materials for a specific subject in a class
 * @route   GET /api/teacher/classes/:classId/subjects/:subjectId/materials
 * @access  Private (Teacher)
 */
const getMaterials = async (req, res) => {
    const { classId, subjectId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> GET Materials for Class: ${classId}, Subject: ${subjectId} by Teacher: ${teacherId}`);

     // Validation
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
        // Find class, verify ownership, project only the matching subject's materials
        const targetClass = await Class.findOne(
            { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
            { 'subjects.$': 1 } // Project only the matching subject
        );

        if (!targetClass || !targetClass.subjects || targetClass.subjects.length === 0) {
             return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }

        // Sort materials by upload date, newest first
        const materials = targetClass.subjects[0].materials?.sort((a, b) => b.uploadedAt - a.uploadedAt) || [];
        console.log(`<--- Found ${materials.length} materials for Subject ${subjectId}`);

        res.status(200).json(materials); // Return the materials array

    } catch (error) {
        console.error(`!!! Error getting materials for Subject ${subjectId}:`, error);
        res.status(500).json({ message: "Server error getting materials." });
    }
};

/**
 * @desc    Delete a specific material file
 * @route   DELETE /api/teacher/classes/:classId/subjects/:subjectId/materials/:materialId
 * @access  Private (Teacher)
 */
const deleteMaterial = async (req, res) => {
    const { classId, subjectId, materialId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> DELETE Material ${materialId} from Subject ${subjectId}, Class ${classId} by Teacher ${teacherId}`);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!mongoose.Types.ObjectId.isValid(materialId)) return res.status(400).json({ message: 'Invalid Material ID.' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
        // 1. Find the class to get the material path *before* deleting the DB record
        const targetClass = await Class.findOne(
             { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
             { 'subjects.$': 1 } // Project only the relevant subject
         );

        if (!targetClass || !targetClass.subjects || targetClass.subjects.length === 0) {
            return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }

        const subject = targetClass.subjects[0];
        const materialToDelete = subject.materials.find(m => m._id.equals(materialId));

        if (!materialToDelete) {
            return res.status(404).json({ message: "Material not found within this subject." });
        }

        const filePathToDelete = materialToDelete.path; // Get path before removing from DB

        // 2. Update the DB: Use $pull to remove the material object from the array
        const updateResult = await Class.updateOne(
            { _id: classId, 'subjects._id': subjectId }, // Find the class and the specific subject
            { $pull: { 'subjects.$.materials': { _id: materialId } } } // Pull the material with the matching _id
        );

        if (updateResult.modifiedCount === 0) {
             console.warn(`!!! Material ${materialId} might not have been found in Subject ${subjectId} during update, or DB update failed.`);
             // This could indicate the material was already deleted. Proceed with file deletion attempt anyway.
             // return res.status(404).json({ message: "Material not found in database for deletion." });
        } else {
             console.log(`<--- Material ${materialId} removed from DB for Subject ${subjectId}`);
        }


        // 3. Delete the actual file from the filesystem if path exists
        if (filePathToDelete && filePathToDelete.startsWith('/uploads/')) {
            const filename = path.basename(filePathToDelete);
            const absolutePathToDelete = path.join(uploadDir, filename);
            fs.unlink(absolutePathToDelete, (err) => {
                if (err && err.code !== 'ENOENT') { console.error(`Error deleting material file ${absolutePathToDelete}:`, err); }
                else if (!err) { console.log(`--- Successfully deleted material file: ${absolutePathToDelete}`); }
            });
        } else {
             console.log(`--- No valid path found for material ${materialId}, skipping file deletion.`);
        }

        // 4. Send Success Response
        res.status(200).json({ success: true, message: 'Material deleted successfully.' });

    } catch (error) {
        console.error(`!!! Error deleting material ${materialId}:`, error);
        res.status(500).json({ message: "Server error deleting material." });
    }
};

// --- NEW Syllabus Management Controllers (Multiple Files) ---

/**
 * @desc    Upload a syllabus file for a specific subject in a class
 * @route   POST /api/teacher/classes/:classId/subjects/:subjectId/syllabi
 * @access  Private (Teacher)
 * @body    FormData with file field named 'syllabusFile'
 */
const uploadSyllabusFile = async (req, res) => {
    const { classId, subjectId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> POST Syllabus File Upload for Class: ${classId}, Subject: ${subjectId} by Teacher: ${teacherId}`);

    // Validation (ensure file exists etc.)
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!req.file) return res.status(400).json({ message: 'No syllabus file uploaded. Field name must be "syllabusFile".' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    const newFilePath = `/uploads/${req.file.filename}`;
    const originalName = req.file.originalname;

    try {
        const newSyllabusEntry = { // Use structure from materialSchema
            originalName: originalName,
            path: newFilePath,
            uploadedAt: new Date()
        };

        const updateResult = await Class.updateOne(
            { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
            { $push: { 'subjects.$.syllabi': newSyllabusEntry } } // Push to 'syllabi' array
        );

        if (updateResult.matchedCount === 0) {
            fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up syllabus file:", err); });
            return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }
        if (updateResult.modifiedCount === 0) {
             fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up syllabus file:", err); });
             console.error(`!!! Failed to push syllabus to Subject ${subjectId}. Update query returned modifiedCount 0.`);
             return res.status(500).json({ message: "Failed to update syllabi list in database." });
        }

        console.log(`<--- Syllabus File "${originalName}" added successfully to Subject ${subjectId}`);

        // Fetch the newly added syllabus entry to return it with its _id
        const updatedClass = await Class.findOne( { _id: classId, 'subjects._id': subjectId }, { 'subjects.$': 1 } );
        const addedSyllabus = updatedClass?.subjects[0]?.syllabi?.find(s => s.path === newFilePath);

        res.status(201).json({
            success: true,
            message: 'Syllabus file uploaded successfully.',
            syllabus: addedSyllabus // Return the newly added syllabus object
        });

    } catch (error) {
        console.error(`!!! Error uploading syllabus file for Subject ${subjectId}:`, error);
        fs.unlink(path.join(uploadDir, req.file.filename), (err) => { if (err) console.error("Error cleaning up new syllabus file on error:", err); });
        res.status(500).json({ message: "Server error uploading syllabus file." });
    }
};

/**
 * @desc    Get all syllabi for a specific subject in a class
 * @route   GET /api/teacher/classes/:classId/subjects/:subjectId/syllabi
 * @access  Private (Teacher)
 */
const getSyllabi = async (req, res) => {
    const { classId, subjectId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> GET Syllabi for Class: ${classId}, Subject: ${subjectId} by Teacher: ${teacherId}`);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
        const targetClass = await Class.findOne(
            { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
            { 'subjects.$': 1 } // Project only the matching subject
        );

        if (!targetClass || !targetClass.subjects || targetClass.subjects.length === 0) {
             return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }

        const syllabi = targetClass.subjects[0].syllabi?.sort((a, b) => b.uploadedAt - a.uploadedAt) || [];
        console.log(`<--- Found ${syllabi.length} syllabi for Subject ${subjectId}`);

        res.status(200).json(syllabi); // Return the syllabi array

    } catch (error) {
        console.error(`!!! Error getting syllabi for Subject ${subjectId}:`, error);
        res.status(500).json({ message: "Server error getting syllabi." });
    }
};

/**
 * @desc    Delete a specific syllabus file
 * @route   DELETE /api/teacher/classes/:classId/subjects/:subjectId/syllabi/:syllabusId
 * @access  Private (Teacher)
 */
const deleteSyllabusFile = async (req, res) => {
    const { classId, subjectId, syllabusId } = req.params; // Note the new syllabusId param
    const teacherId = req.user.userId;
    console.log(`---> DELETE Syllabus File ${syllabusId} from Subject ${subjectId}, Class ${classId} by Teacher ${teacherId}`);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
    if (!mongoose.Types.ObjectId.isValid(syllabusId)) return res.status(400).json({ message: 'Invalid Syllabus File ID.' });
    if (!teacherId) return res.status(401).json({ message: "Authentication error" });

    try {
        // Find the class to get the file path before deleting
        const targetClass = await Class.findOne(
             { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
             { 'subjects.$': 1 }
         );

        if (!targetClass || !targetClass.subjects || targetClass.subjects.length === 0) {
            return res.status(404).json({ message: "Class or Subject not found, or access denied." });
        }

        const subject = targetClass.subjects[0];
        const syllabusToDelete = subject.syllabi.find(s => s._id.equals(syllabusId));

        if (!syllabusToDelete) {
            return res.status(404).json({ message: "Syllabus file not found within this subject." });
        }

        const filePathToDelete = syllabusToDelete.path;

        // Update the DB: Use $pull to remove the syllabus object from the array
        const updateResult = await Class.updateOne(
            { _id: classId, 'subjects._id': subjectId },
            { $pull: { 'subjects.$.syllabi': { _id: syllabusId } } }
        );

        if (updateResult.modifiedCount === 0) {
             console.warn(`!!! Syllabus file ${syllabusId} might not have been found in Subject ${subjectId} during update, or DB update failed.`);
        } else {
             console.log(`<--- Syllabus file ${syllabusId} removed from DB for Subject ${subjectId}`);
        }

        // Delete the actual file
        if (filePathToDelete && filePathToDelete.startsWith('/uploads/')) {
            const filename = path.basename(filePathToDelete);
            const absolutePathToDelete = path.join(uploadDir, filename);
            fs.unlink(absolutePathToDelete, (err) => {
                if (err && err.code !== 'ENOENT') { console.error(`Error deleting syllabus file ${absolutePathToDelete}:`, err); }
                else if (!err) { console.log(`--- Successfully deleted syllabus file: ${absolutePathToDelete}`); }
            });
        } else {
             console.log(`--- No valid path found for syllabus file ${syllabusId}, skipping file deletion.`);
        }

        res.status(200).json({ success: true, message: 'Syllabus file deleted successfully.' });

    } catch (error) {
        console.error(`!!! Error deleting syllabus file ${syllabusId}:`, error);
        res.status(500).json({ message: "Server error deleting syllabus file." });
    }
};

 /**
  * @desc    Download a specific syllabus file
  * @route   GET /api/teacher/classes/:classId/subjects/:subjectId/syllabi/:syllabusId/download
  * @access  Private (Teacher)
  */
 const downloadSyllabusFile = async (req, res) => {
     const { classId, subjectId, syllabusId } = req.params;
     const teacherId = req.user.userId;
     console.log(`---> GET Syllabus File Download ${syllabusId} from Subject ${subjectId}, Class ${classId} by Teacher ${teacherId}`);

     // Validation...
     if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
     if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ message: 'Invalid Subject ID.' });
     if (!mongoose.Types.ObjectId.isValid(syllabusId)) return res.status(400).json({ message: 'Invalid Syllabus File ID.' });
     if (!teacherId) return res.status(401).json({ message: "Authentication error" });

     try {
         // 1. Find the class, verify ownership, and get the specific syllabus entry
         const targetClass = await Class.findOne(
             { _id: classId, teacher: teacherId, 'subjects._id': subjectId },
             { 'subjects.$': 1 } // Project only the matching subject
         );

         if (!targetClass || !targetClass.subjects || targetClass.subjects.length === 0) {
             return res.status(404).json({ message: "Class or Subject not found, or access denied." });
         }

         const subject = targetClass.subjects[0];
         const syllabusToDownload = subject.syllabi.find(s => s._id.equals(syllabusId));

         if (!syllabusToDownload) {
              return res.status(404).json({ message: "Syllabus file not found within this subject." });
         }

         const syllabusPath = syllabusToDownload.path;
         const originalFilename = syllabusToDownload.originalName; // Get original name for download

         if (!syllabusPath || !syllabusPath.startsWith('/uploads/')) {
             return res.status(404).json({ message: "Syllabus path is invalid." });
         }

         // 2. Construct the full absolute path
         const filenameOnServer = path.basename(syllabusPath);
         const absoluteFilePath = path.join(uploadDir, filenameOnServer);

         // 3. Check if file exists
         if (!fs.existsSync(absoluteFilePath)) {
             console.error(`!!! Syllabus file not found on server at path: ${absoluteFilePath}`);
             return res.status(404).json({ message: "Syllabus file not found on server." });
         }

         // 4. Use res.download(), providing the original filename
         console.log(`<--- Initiating download for syllabus file: ${absoluteFilePath}`);
         res.download(absoluteFilePath, originalFilename, (err) => { // Use originalFilename
             if (err) {
                 console.error(`!!! Error during syllabus file download stream for ${absoluteFilePath}:`, err);
                 if (!res.headersSent) {
                      res.status(500).json({ message: "Error downloading syllabus file." });
                 }
             } else {
                  console.log(`--- Successfully sent syllabus file for download: ${absoluteFilePath}`);
             }
         });

     } catch (error) {
         console.error(`!!! Error preparing syllabus file download ${syllabusId}:`, error);
         if (!res.headersSent) {
             res.status(500).json({ message: "Server error preparing syllabus file download." });
         }
     }
 };

 // backend/controllers/teacherController.js

// ... (other requires and functions) ...

/**
 * @desc    Get profile of a specific student (for teacher view)
 * @route   GET /api/teacher/students/:studentId/profile
 * @access  Private (Teacher)
 */
const getStudentProfileForTeacher = async (req, res) => {
    const { studentId } = req.params;
    const teacherId = req.user.userId;
    console.log(`---> GET /api/teacher/students/${studentId}/profile by Teacher ID: ${teacherId}`);

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: 'Invalid Student ID format.' });
    }
     if (!teacherId) { return res.status(401).json({ message: "Authentication error" }); }

    try {
        // **Authorization Check:** Verify the teacher manages a class this student is in
        const authorizedClass = await Class.findOne({ teacher: teacherId, students: studentId });

        if (!authorizedClass) {
             console.warn(`Teacher ${teacherId} does not have access to student ${studentId}`);
            return res.status(403).json({ message: "Access Denied: You do not manage this student." });
        }

        // Fetch the student's full profile (excluding password)
         const studentProfile = await User.findById(studentId).select('-password -__v'); // Exclude version key too

        if (!studentProfile) {
             return res.status(404).json({ message: 'Student profile not found.' });
        }

        // Ensure we are not returning data for a non-student user type somehow
         if (studentProfile.userType !== 'student') {
            return res.status(404).json({ message: 'User found is not a student.' });
        }

        console.log(`<--- Sending student profile ${studentId} to teacher ${teacherId}`);
        res.status(200).json(studentProfile);

    } catch (error) {
         console.error(`!!! Error fetching student profile ${studentId} for teacher ${teacherId}:`, error);
         res.status(500).json({ message: "Server error fetching student profile." });
    }
};
/**
 * @desc    Fetch student list for a class AND their attendance status for a specific date/subject/period
 * @route   GET /api/teacher/attendance?classId=...&subjectId=...&date=...&period=...
 * @access  Private (Teacher)
 */
const fetchAttendanceForDate = async (req, res) => {
    const { classId, date } = req.query;
    const teacherId = req.user.userId;
    console.log(`---> GET /api/teacher/attendance for Class: ${classId}, Date: ${date} by Teacher: ${teacherId}`);

    // --- Validations ---
    if (!classId || !date) return res.status(400).json({ message: "Missing params: classId, date." });
    
    let attendanceDate;
    try {
        const parts = date.split('-');
        attendanceDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0));
        if (isNaN(attendanceDate.getTime())) throw new Error('Invalid Date value');
    } catch(e){ return res.status(400).json({ message: e.message || 'Invalid Date value.' }); }

    try {
        // 1. Verify teacher owns class & get student IDs
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherId })
            .select('students')
            .populate({
                path: 'students',
                select: 'email profile.firstName profile.lastName profile.fullName profile.phone username',
                options: { lean: true }
            });
        
        if (!targetClass) return res.status(404).json({ message: "Class not found or access denied." });

        const studentsInClass = targetClass.students || [];
        if (studentsInClass.length === 0) {
            console.log(`--- No students found in class ${classId}`);
            return res.status(200).json({ students: [], attendanceStatus: {} });
        }

        // 2. Format student data with proper names
        const formattedStudents = studentsInClass.map(student => {
            // Determine the display name
            let displayName;
            if (student.profile?.fullName) {
                displayName = student.profile.fullName;
            } else {
                const firstName = student.profile?.firstName || '';
                const lastName = student.profile?.lastName || '';
                displayName = `${firstName} ${lastName}`.trim();
                if (!displayName) displayName = student.username;
            }

            return {
                _id: student._id,
                email: student.email,
                profile: {
                    fullName: displayName,
                    phone: student.profile?.phone || 'Not provided'
                }
            };
        });

        // 3. Get student IDs for attendance query
        const studentIds = studentsInClass.map(s => s._id);

        // 4. Fetch existing attendance for these students ON THIS DATE ONLY
        const existingAttendance = await Attendance.find({
            date: attendanceDate,
            class: classId,
            student: { $in: studentIds }
        }).select('student status').lean();

        // 5. Create status map
        const attendanceStatusMap = existingAttendance.reduce((map, record) => {
            map[record.student.toString()] = record.status;
            return map;
        }, {});

        // 6. Send response with properly formatted students
        res.status(200).json({ 
            students: formattedStudents, 
            attendanceStatus: attendanceStatusMap 
        });

    } catch (error) {
        console.error("!!! Error in fetchAttendanceForDate:", error);
        res.status(500).json({ message: "Server error fetching attendance data." });
    }
};
/**
 * @desc    Get attendance records for a specific class on a specific date
 * @route   GET /api/teacher/attendance/reports/class/:classId?date=YYYY-MM-DD
 * @access  Private (Teacher)
 */
const getClassAttendanceReport = async (req, res) => {
    const { classId } = req.params;
    const { date } = req.query;
    const teacherId = req.user?.userId;

    console.log(`---> GET Report for Class ${classId}, Date ${date} by Teacher ${teacherId}`);

    // --- Validations ---
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Invalid or missing Class ID.' });
    }
    if (!date) {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }
    let attendanceDate;
    try {
        const parts = date.split('-');
        attendanceDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0));
        if (isNaN(attendanceDate.getTime())) throw new Error('Invalid date value');
    } catch (e) {
        return res.status(400).json({ message: e.message || 'Invalid Date value.' });
    }
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(401).json({ message: "Authentication error."});
    }

    try {
        // 1. Verify teacher owns class
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherId }).select('_id').lean();
        if (!targetClass) {
            console.warn(`[Report] Teacher ${teacherId} access denied or class ${classId} not found.`);
            return res.status(403).json({ message: "Access denied or class not found." });
        }

        // 2. Fetch attendance records with proper student population
        const attendanceRecords = await Attendance.find({
            class: classId,
            date: attendanceDate
        })
        .populate({
            path: 'student',
            model: 'User',
            select: 'email username profile.firstName profile.lastName profile.fullName profile.phone'
        })
        .lean();

        // Format the records with proper names and phone numbers
        const formattedRecords = attendanceRecords.map(record => {
            const student = record.student;
            const fullName = student.profile?.fullName || 
                           `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || 
                           student.username;
            
            return {
                ...record,
                student: {
                    _id: student._id,
                    email: student.email,
                    profile: {
                        fullName: fullName,
                        phone: student.profile?.phone || 'Not provided'
                    }
                }
            };
        });

        res.status(200).json(formattedRecords);

    } catch (error) {
        console.error(`!!! [Report] Error fetching attendance report for class ${classId}, date ${date}:`, error);
        res.status(500).json({ message: "Server error fetching report." });
    }
};

// /**
//  * @desc    Fetch student list for a class AND their attendance status for a specific date/subject/period
//  * @route   GET /api/teacher/attendance?classId=...&subjectId=...&date=...&period=...
//  * @access  Private (Teacher)
//  */
// const fetchAttendanceForDate = async (req, res) => {
//     const { classId, date } = req.query;
//     const teacherId = req.user.userId;
//     console.log(`---> GET /api/teacher/attendance for Class: ${classId}, Date: ${date} by Teacher: ${teacherId}`);

//     // --- Validations ---
//     if (!classId || !date) return res.status(400).json({ message: "Missing params: classId, date." });
//     // ... other validations for classId, date format ...
//     let attendanceDate;
//     try {
//         const parts = date.split('-');
//         attendanceDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0));
//         if (isNaN(attendanceDate.getTime())) throw new Error('Invalid Date value');
//     } catch(e){ return res.status(400).json({ message: e.message || 'Invalid Date value.' }); }


//     try {
//         // 1. Verify teacher owns class & get student IDs
//         const targetClass = await Class.findOne({ _id: classId, teacher: teacherId }).select('students').lean();
//         if (!targetClass) return res.status(404).json({ message: "Class not found or access denied." });

//         const studentIdsInClass = targetClass.students || [];
//         if (studentIdsInClass.length === 0) {
//             console.log(`--- No students found in class ${classId}`);
//             return res.status(200).json({ students: [], attendanceStatus: {} });
//         }
//         console.log(`--- Student IDs in class ${classId}:`, studentIdsInClass);

//         // 2. Fetch student details - *** ENSURE PROFILE IS SELECTED ***
//         const studentsInClass = await User.find({ _id: { $in: studentIdsInClass } })
//             // *** Select the profile subdocument, and specifically fullName, or the whole profile ***
//             .select('email profile.firstName profile.lastName profile.fullName username') // Add username as fallback
//             .lean();
//         console.log(`--- Fetched ${studentsInClass.length} student details.`);
//         // studentsInClass.forEach(s => console.log(s.profile)); // Debug: check profile content

//         // 3. Fetch existing attendance for these students ON THIS DATE ONLY
//         const existingAttendance = await Attendance.find({
//              date: attendanceDate,
//              class: classId,
//              student: { $in: studentIdsInClass }
//         }).select('student status').lean();

//         // 4. Create status map
//         const attendanceStatusMap = existingAttendance.reduce((map, record) => {
//             map[record.student.toString()] = record.status;
//             return map;
//         }, {});
//         console.log(`<--- Found ${existingAttendance.length} existing attendance records.`);

//         // 5. Send response
//         res.status(200).json({ students: studentsInClass, attendanceStatus: attendanceStatusMap });

//     } catch (error) {
//         console.error("!!! Error in fetchAttendanceForDate:", error);
//         res.status(500).json({ message: "Server error fetching attendance data." });
//     }
// };


// Ensure you have also correctly defined and exported saveAttendance
// module.exports should include fetchAttendanceForDate and saveAttendance

/**
 * @desc    Save/Update attendance data for multiple students
 * @route   POST /api/teacher/attendance
 *          (This route needs to be created in teacherRoutes.js)
 * @access  Private (Teacher)
 * @body    { classId, subjectId, date, period, attendance: { studentId: status, ... } }
 */
const saveAttendance = async (req, res) => {
    // REMOVED subjectId, period from destructuring
    const { classId, date, attendance } = req.body;
    const teacherId = req.user.userId;
    console.log(`---> POST /api/teacher/attendance by Teacher ${teacherId}`);
    console.log(`--- Payload: Class ${classId}, Date ${date}`);

    // --- Validations ---
    if (!classId || !date || !attendance || typeof attendance !== 'object') return res.status(400).json({ message: "Missing required fields: classId, date, attendance object." });
    if (Object.keys(attendance).length === 0) return res.status(400).json({ message: "Attendance data cannot be empty." });
    // ... other validations ...

    let attendanceDate; // Convert date string
    try {
        const parts = date.split('-'); attendanceDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0)); if (isNaN(attendanceDate.getTime())) throw new Error();
    } catch(e){ return res.status(400).json({ message: 'Invalid Date value.' }); }

    try {
        // 1. Verify Teacher owns class (Optional but good)
         const targetClass = await Class.findOne({ _id: classId, teacher: teacherId }).select('_id'); // Just need to check existence/ownership
         if (!targetClass) { return res.status(403).json({ message: "Access denied or invalid class." }); }

        // 2. Prepare bulk operations
        const operations = [];
        for (const studentId in attendance) {
             if (!mongoose.Types.ObjectId.isValid(studentId)) continue; // Skip invalid IDs
             const status = attendance[studentId];
             if (!['present', 'absent', 'late'].includes(status)) continue; // Skip invalid statuses

            operations.push({
                updateOne: {
                    filter: { // Find doc by date, class, student ONLY
                        date: attendanceDate,
                        class: classId,
                        student: studentId
                    },
                    update: {
                        $set: { status: status, markedBy: teacherId }, // Update status and marker
                        $setOnInsert: { // Set these ONLY if creating new
                            date: attendanceDate, class: classId, student: studentId
                        }
                    },
                    upsert: true // Create if doesn't exist
                }
            });
        }
         if (operations.length === 0) return res.status(400).json({ message: "No valid attendance data provided." });

        // 3. Execute bulk write
        console.log(`Performing ${operations.length} upsert ops for attendance...`);
        const bulkResult = await Attendance.bulkWrite(operations, { ordered: false });
        console.log("<--- Bulk write result:", bulkResult);

         res.status(200).json({ success: true, message: `Attendance saved. Processed: ${operations.length}` });

    } catch (error) { /* ... Error Handling ... */ }
};

// // --- NEW/MODIFIED FUNCTION FOR REPORTS ---
// /**
//  * @desc    Get attendance records for a specific class on a specific date
//  * @route   GET /api/teacher/attendance/reports/class/:classId?date=YYYY-MM-DD
//  * @access  Private (Teacher)
//  */
// const getClassAttendanceReport = async (req, res) => {
//     const { classId } = req.params;
//     const { date } = req.query;
//     const teacherId = req.user.userId;

//     console.log(`---> GET Report for Class ${classId}, Date ${date} by Teacher ${teacherId}`);
//     // ... (Validations for classId, date, attendanceDate conversion) ...
//     if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ message: 'Invalid Class ID.' });
//     if (!date) return res.status(400).json({ message: 'Date parameter is required.' });
//     let attendanceDate;
//     try { const parts = date.split('-'); attendanceDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),0,0,0,0)); if (isNaN(attendanceDate.getTime())) throw new Error(); }
//     catch(e){ return res.status(400).json({ message: 'Invalid Date value.' }); }


//     try {
//         // 1. Verify teacher owns class
//         const targetClass = await Class.findOne({ _id: classId, teacher: teacherId }).select('_id').lean();
//         if (!targetClass) return res.status(403).json({ message: "Access denied or class not found." });

//         // 2. Fetch attendance records and populate student details
//         // *** ENSURE POPULATE SELECTS CORRECT FIELDS ***
//         const attendanceRecords = await Attendance.find({
//              class: classId,
//              date: attendanceDate
//         })
//         .populate({
//             path: 'student', // Path to the 'student' field in Attendance model (which refs 'User')
//             select: 'email profile.firstName profile.lastName profile.fullName username' // Explicitly select nested fields
//         })
//         .sort({ 'student.profile.fullName': 1 }) // Sort by populated student's full name
//         .lean();

//         console.log(`<--- Found ${attendanceRecords.length} attendance report records.`);
//         // attendanceRecords.forEach(r => console.log(r.student?.profile)); // Debug: check profile content

//         res.status(200).json(attendanceRecords);

//      } catch (error) {
//          console.error(`!!! Error fetching attendance report for class ${classId}, date ${date}:`, error);
//          res.status(500).json({ message: "Server error fetching report." });
//     }
//  };


/**
 * @desc    Create a new Quiz
 * @route   POST /api/teacher/quizzes
 * @access  Private (Teacher)
 * @body    { title, description?, classId, subjectId, timeLimitMinutes?, questions: [{questionText, options, correctAnswerIndex}] }
 */
const createQuiz = async (req, res) => {
    const {
        title, description, classId, subjectId,
        timeLimitMinutes, questions, status // status can be 'Draft' or 'Published' from frontend
    } = req.body;
    const teacherIdString = req.user?.userId; // From authMiddleware

    console.log(`[createQuiz] Attempt by Teacher: ${teacherIdString}`);
    console.log("[createQuiz] Received Payload:", JSON.stringify(req.body, null, 2));

    // --- 1. Validate Teacher ID ---
    if (!teacherIdString || !mongoose.Types.ObjectId.isValid(teacherIdString)) {
        console.error(`[createQuiz] Invalid Teacher ID: ${teacherIdString}`);
        return res.status(401).json({ message: "Authentication error: Invalid user identifier." });
    }
    const teacherObjectId = new mongoose.Types.ObjectId(teacherIdString);

    // --- 2. Validate Payload ---
    let validationErrors = [];
    if (!title?.trim()) validationErrors.push("Quiz Title is required.");
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) validationErrors.push("Valid Class selection is required.");
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) validationErrors.push("Valid Subject selection is required.");
    if (!Array.isArray(questions) || questions.length === 0) {
        validationErrors.push('Quiz needs at least one question.');
    } else {
        questions.forEach((q, i) => {
            const num = i + 1;
            if (!q || typeof q !== 'object') { validationErrors.push(`Data missing for question #${num}.`); return; }
            if (!q.questionText?.trim()) validationErrors.push(`Text missing for question #${num}.`);
            if (!Array.isArray(q.options) || q.options.length < 2) { validationErrors.push(`At least 2 options needed for question #${num}.`); }
            else {
                const nonEmptyOptions = q.options.filter(opt => typeof opt === 'string' && opt.trim());
                if (nonEmptyOptions.length < 2) validationErrors.push(`At least 2 non-empty options needed for question #${num}.`);
                if (q.correctAnswerIndex === undefined || q.correctAnswerIndex === null || typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
                    validationErrors.push(`Valid correct answer selection needed for question #${num}.`);
                } else if (!q.options[q.correctAnswerIndex]?.trim()) { // Check if selected option is empty
                    validationErrors.push(`Selected correct answer for question #${num} cannot be empty.`);
                }
            }
        });
    }
    if (timeLimitMinutes && (isNaN(Number(timeLimitMinutes)) || Number(timeLimitMinutes) <= 0)) {
        validationErrors.push('Time limit must be a positive number.');
    }
    // Status validation (allow only Draft or Published on creation)
    const finalStatus = (status === 'Published') ? 'Published' : 'Draft';

    if (validationErrors.length > 0) {
        console.warn("[createQuiz] Validation Failed:", validationErrors);
        return res.status(400).json({ message: validationErrors.join(' ') });
    }

    // --- 3. Perform Database Operations ---
    try {
        // Verify Class ownership and find Subject Name
        const targetClass = await Class.findOne({ _id: classId, teacher: teacherObjectId }).select('subjects name');
        if (!targetClass) {
            console.warn(`[createQuiz] Class ${classId} not found or not owned by teacher ${teacherObjectId}`);
            return res.status(403).json({ message: "Class not found or access denied." }); // 403 more appropriate than 404
        }

        const targetSubject = targetClass.subjects.find(subj => subj._id.equals(subjectId));
        if (!targetSubject) {
             console.warn(`[createQuiz] Subject ${subjectId} not found within class ${classId}`);
            return res.status(400).json({ message: "Selected subject not found within the specified class." }); // 400 as input is bad
        }
        const subjectName = targetSubject.name; // Get name

        // Prepare document data
        const quizDocData = {
            title: title.trim(),
            description: description ? description.trim() : '',
            classId,
            subjectId,
            subjectName: subjectName, // Add subject name
            teacher: teacherObjectId, // Use correct field name and ObjectId
            timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
            questions: questions.map(q => ({ // Sanitize question data
                 questionText: q.questionText.trim(),
                 options: q.options.map(opt => (opt || '').trim()),
                 correctAnswerIndex: q.correctAnswerIndex
             })),
            status: finalStatus,
        };

        console.log("[createQuiz] Attempting to save document...");
        const newQuiz = new Quiz(quizDocData);
        const savedQuiz = await newQuiz.save(); // Save to DB

        console.log(`<--- [createQuiz] Success! Quiz ID: ${savedQuiz._id}, Status: ${finalStatus}`);

        // Manually structure response data (including populated-like class info)
        const responseData = {
             ...savedQuiz.toObject(), // Convert Mongoose doc to plain object
             classId: { _id: targetClass._id, name: targetClass.name } // Add class info
        };
        delete responseData.__v; // Remove version key

        res.status(201).json(responseData); // Return created quiz

    } catch (error) {
        console.error(`!!! [createQuiz] Error during DB operation for teacher ${teacherObjectId}:`, error);
        if (error.name === 'ValidationError') {
            console.error("--- Mongoose Validation Errors ---:", error.errors);
            const messages = Object.values(error.errors).map(e => e.message).join('. ');
            return res.status(400).json({ message: `Validation Error: ${messages}` });
        }
        // General server error
        res.status(500).json({ message: "Server error while saving the quiz." });
    }
};

// --- Make sure getQuizzesByTeacher is also exported correctly in module.exports ---
// const getQuizzesByTeacher = async (req, res) => { ... };


/**
 * @desc    Get quizzes created by the logged-in teacher
 * @route   GET /api/teacher/quizzes
 * @access  Private (Teacher)
 * @query   classId?, subjectId?, status? (Optional filters)
 */
const getQuizzesByTeacher = async (req, res) => {
    const teacherIdString = req.user?.userId; // Get ID string

    // --- Validate Teacher ID ---
    if (!teacherIdString || !mongoose.Types.ObjectId.isValid(teacherIdString)) {
        console.error(`!!! Invalid or missing teacherId in getQuizzesByTeacher: ${teacherIdString}`);
        return res.status(401).json({ message: "Authentication error: User identifier invalid." });
    }
    // --- Convert teacherId string to ObjectId for querying ---
    const teacherObjectId = new mongoose.Types.ObjectId(teacherIdString);
    // -------------------------------------------------------

    const { classId, subjectId, status } = req.query;
    console.log(`---> GET /api/teacher/quizzes requested by Teacher ${teacherObjectId}`, req.query);

    try {
        // --- Use ObjectId in the query ---
        const query = { teacher: teacherObjectId }; // <-- Use the converted ObjectId
        // ---------------------------------

        // Apply filters
        if (classId && mongoose.Types.ObjectId.isValid(classId)) {
            query.classId = classId;
        }
        if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
            query.subjectId = subjectId;
        }
        if (status && ['Draft', 'Published', 'Closed'].includes(status)) {
            query.status = status;
        }

        console.log("--- Backend: Querying quizzes with:", query);

        // Execute query
        const quizzes = await Quiz.find(query)
            .populate('classId', 'name') // Populate class name
            .sort({ createdAt: -1 })     // Sort newest first
            .lean();                     // Use lean for plain JS objects

        console.log(`--- Backend: Found ${quizzes.length} quizzes in DB for query.`);
        if (quizzes.length > 0) {
             // Log first quiz details to verify structure and population
             console.log("--- Backend: First quiz details (sample):", JSON.stringify(quizzes[0], null, 2));
        }

        res.status(200).json(quizzes); // Send the result (even if empty array)

    } catch (error) {
        console.error(`!!! Backend Error in getQuizzesByTeacher for teacher ${teacherObjectId}:`, error);
        res.status(500).json({ message: "Server error fetching quizzes." });
    }
};

/**
 * @desc    Update Quiz Status (e.g., Publish a Draft)
 * @route   PUT /api/teacher/quizzes/:quizId/status
 * @access  Private (Teacher)
 * @body    { status: 'Published' | 'Closed' | 'Draft' }
 */
const updateQuizStatus = async (req, res) => {
    const { quizId } = req.params;
    const { status } = req.body;
    const teacherId = req.user?.userId; // <-- Get ID string into 'teacherId' variable

    console.log(`---> PUT /api/teacher/quizzes/${quizId}/status by Teacher ${teacherId}`);
    console.log("--- Payload:", req.body);

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        return res.status(400).json({ message: 'Invalid Quiz ID format.' });
    }
    if (!status || !['Published', 'Closed', 'Draft'].includes(status)) {
        return res.status(400).json({ message: 'Invalid or missing status provided.' });
    }
    // *** FIX: Validate teacherId (the string) BEFORE converting ***
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
        console.error(`!!! Invalid or missing teacherId in updateQuizStatus: ${teacherId}`);
        return res.status(401).json({ message: "Authentication error: Invalid user identifier." });
    }
    // *** FIX: Convert the correct variable 'teacherId' ***
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    // *********************************************************

    try {
        // Find the quiz ensuring it belongs to the teacher
        // *** FIX: Use teacherObjectId in the query ***
        const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherObjectId });

        if (!quiz) {
            console.warn(`Quiz ${quizId} not found or not owned by teacher ${teacherObjectId}`);
            return res.status(404).json({ message: 'Quiz not found or access denied.' });
        }

        // Prevent certain status changes if needed (example: cannot re-publish a closed quiz directly)
        if (quiz.status === 'Closed' && status === 'Published') {
             return res.status(400).json({ message: 'Cannot directly re-publish a closed quiz.' });
        }

        // Update status & potentially publishDate
        quiz.status = status;
        if (status === 'Published' && !quiz.publishDate) { // Set publish date only if newly published
            quiz.publishDate = new Date();
            console.log(`--- Setting publishDate for quiz ${quizId}`);
        }

        const updatedQuiz = await quiz.save(); // Save changes

        // Populate class name for response
        const populatedQuiz = await Quiz.findById(updatedQuiz._id)
                                        .populate('classId', 'name')
                                        .lean();

        console.log(`<--- Quiz ${quizId} status updated to ${status} successfully.`);
        res.status(200).json(populatedQuiz); // Send back updated quiz

    } catch (error) {
        console.error(`!!! Error updating status for quiz ${quizId}:`, error);
        if (error.name === 'ValidationError') { /* ... */ }
        res.status(500).json({ message: 'Server error updating quiz status.' });
    }
};

// --- NEW FUNCTION ---
/**
 * @desc    Delete a Quiz
 * @route   DELETE /api/teacher/quizzes/:quizId
 * @access  Private (Teacher)
 */
const deleteQuiz = async (req, res) => {
    const { quizId } = req.params;
    const teacherId = req.user?.userId; // <-- Get ID string into 'teacherId' variable

    console.log(`---> DELETE /api/teacher/quizzes/${quizId} by Teacher ${teacherId}`);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        return res.status(400).json({ message: 'Invalid Quiz ID format.' });
    }
    // *** FIX: Validate teacherId (the string) BEFORE converting ***
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
         console.error(`!!! Invalid or missing teacherId in deleteQuiz: ${teacherId}`);
         return res.status(401).json({ message: "Authentication error: Invalid user identifier." });
    }
    // *** FIX: Convert the correct variable 'teacherId' ***
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    // *********************************************************

    try {
        // Find the quiz and delete it, ensuring it belongs to the teacher
        // *** FIX: Use teacherObjectId in the query ***
        const quizToDelete = await Quiz.findOneAndDelete({
             _id: quizId,
             teacher: teacherObjectId // Ensure only the owner can delete
             // Optional: Add status check here if desired
             // status: { $in: ['Draft', 'Closed'] }
        });

        if (!quizToDelete) {
            console.warn(`Quiz ${quizId} not found for deletion or access denied for teacher ${teacherObjectId}`);
            return res.status(404).json({ message: 'Quiz not found or you do not have permission to delete it.' });
        }

        // TODO Optional: Delete associated QuizAttempt results
        // await QuizAttempt.deleteMany({ quizId: quizId });

        console.log(`<--- Quiz ${quizId} deleted successfully.`);
        res.status(200).json({ success: true, message: 'Quiz deleted successfully.' });

    } catch (error) {
        console.error(`!!! Error deleting quiz ${quizId}:`, error);
        res.status(500).json({ message: 'Server error while deleting the quiz.' });
    }
};

// --- NEW FUNCTION ---
/**
 * @desc    Get Results for a specific Quiz (Attempts with Student Info)
 * @route   GET /api/teacher/quizzes/:quizId/results
 * @access  Private (Teacher)
 */
const getQuizResults = async (req, res) => {
    const { quizId } = req.params;
    const teacherIdString = req.user?.userId; // Use correct variable from middleware

    console.log(`---> GET /api/teacher/quizzes/${quizId}/results by Teacher ${teacherIdString}`);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId)) { return res.status(400).json({ message: 'Invalid Quiz ID format.' }); }
    if (!teacherIdString || !mongoose.Types.ObjectId.isValid(teacherIdString)) { return res.status(401).json({ message: "Authentication error: Invalid user identifier." }); }
    const teacherObjectId = new mongoose.Types.ObjectId(teacherIdString);

    try {
        // 1. Find the quiz, verify ownership, and SELECT totalMarks explicitly
        console.log(`--- [QuizResults] Fetching quiz details for ${quizId}`);
        const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherObjectId })
                             // *** Ensure totalMarks is selected ***
                             .select('title subjectName totalMarks classId')
                             .populate('classId', 'name') // Populate class name
                             .lean();

        if (!quiz) {
            console.warn(`Quiz ${quizId} not found or not owned by teacher ${teacherObjectId}`);
            return res.status(404).json({ message: 'Quiz not found or access denied.' });
        }
        // Log the fetched quiz details, including totalMarks
        console.log(`--- [QuizResults] Found Quiz Details: Title: ${quiz.title}, Class: ${quiz.classId?.name}, Subject: ${quiz.subjectName}, Total Marks: ${quiz.totalMarks}`);
        // Check if totalMarks is missing from the quiz document itself
        if (quiz.totalMarks === undefined || quiz.totalMarks === null) {
             console.warn(`!!! Quiz document ${quizId} is missing the 'totalMarks' field!`);
             // Optionally set a default if appropriate, or handle in frontend
        }

        // 2. Find all attempts for this quiz, selecting necessary fields
        console.log(`--- [QuizResults] Fetching attempts for Quiz ID: ${quizId}`);
        const attempts = await QuizAttempt.find({ quizId: quizId })
            // Populate student details
            .populate({
                path: 'studentId',
                select: 'profile.fullName email username' // Select fields needed for display
            })
            // *** Ensure all required attempt fields are selected ***
            .select('studentId score totalQuestions percentage submittedAt createdAt')
            .sort({ submittedAt: -1 }) // Sort by submission time
            .lean();

        console.log(`--- [QuizResults] Found ${attempts.length} attempts.`);
        if (attempts.length > 0) {
            console.log("--- [QuizResults] First attempt sample:", JSON.stringify(attempts[0], null, 2));
        }

        // 3. Combine quiz details and attempts in the response
        res.status(200).json({
            quizDetails: quiz, // Contains title, subjectName, totalMarks, classId { _id, name }
            attempts: attempts // Contains populated studentId, score, totalQuestions, percentage, submittedAt etc.
        });

    } catch (error) {
        console.error(`!!! Error fetching results for quiz ${quizId}:`, error);
        res.status(500).json({ message: 'Server error fetching quiz results.' });
    }
};


// --- *** Update Exports *** ---
module.exports = {
  getTeacherProfile,
  updateTeacherProfile,
  uploadProfileImage,
  deleteProfileImage,
  changePassword,
//   addStudentToClass,
  // Add the new functions:
  getTeacherClasses,
  createTeacherClass,
  updateTeacherClass,
  deleteTeacherClass,
  getStudentsForClass,
  deleteStudentFromClass,
  addSubjectToClass, 
  getSubjectsForClass,
  uploadMaterial,      // <-- ADD
  getMaterials,        // <-- ADD
  deleteMaterial, 
  uploadSyllabusFile,    // ADD
  getSyllabi,            // ADD
  deleteSyllabusFile,    // ADD
  downloadSyllabusFile,  // ADD
  getStudentProfileForTeacher,
  fetchAttendanceForDate, // <-- ADD or Ensure correct name
  saveAttendance,   
  getClassAttendanceReport,
  createQuiz,             // <-- ADD
  getQuizzesByTeacher, 
  updateQuizStatus, // <-- ADDED
  deleteQuiz, 
  getQuizResults,
  // Keep upload instance
  uploadImage,
  uploadDocument 
};