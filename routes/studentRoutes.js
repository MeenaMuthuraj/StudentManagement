// backend/routes/studentRoutes.js

// --- Top-Level Requires ---
const express = require('express');
const multer = require('multer'); // <<<< REQUIRE MULTER AT THE VERY TOP >>>>
const path = require('path');
const fs = require('fs');
const { // Controller Functions
    getStudentProfile,
    updateStudentProfile,
    uploadStudentProfileImage,
    deleteStudentProfileImage,
    getStudentSubjectsAndMaterials,
    getPublishedQuizzesForStudent,
    getQuizForTaking,
    submitQuizAttempt,
    getStudentAttendanceRecords,
    getStudentQuizAttempts,
    getStudentDashboardSummary
} = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Define Multer Instance (`uploadImage`) ---
// This function attempts to get the instance, falling back if necessary.
function setupMulter() {
    let instance;
    try {
        // Attempt to reuse from teacherController
        const teacherUploadImage = require('../controllers/teacherController').uploadImage;
        if (teacherUploadImage && typeof teacherUploadImage.single === 'function') {
            instance = teacherUploadImage;
            console.log("Successfully reused 'uploadImage' multer instance from teacherController.");
        } else {
            throw new Error("Imported 'uploadImage' is not a valid multer instance.");
        }
    } catch (error) {
        // Fallback: Define Multer setup here
        console.warn("Could not reuse 'uploadImage' from teacherController. Defining fallback. Reason:", error.message);

        const uploadDir = path.join(__dirname, '..', 'uploads');
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log(`Fallback setup: Created directory: ${uploadDir}`);
            }

            const storage = multer.diskStorage({
                destination: (req, file, cb) => cb(null, uploadDir),
                filename: (req, file, cb) => {
                    if (!req.user || !req.user.userId) {
                        console.error("Multer filename error: User ID missing. Ensure authMiddleware runs before.");
                        return cb(new Error("User authentication data missing for filename."));
                    }
                    const uniqueSuffix = `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`;
                    cb(null, uniqueSuffix);
                }
            });

            const fileFilter = (req, file, cb) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    req.fileValidationError = 'Only image files (jpg, jpeg, png, gif) are allowed!';
                    return cb(null, false); // Reject file, handle error in subsequent middleware
                }
                cb(null, true); // Accept file
            };

            // Use the top-level 'multer' require here
            instance = multer({
                storage: storage,
                fileFilter: fileFilter,
                limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
            });
            console.log("Fallback multer 'uploadImage' instance created.");

        } catch (setupError) {
            console.error(`Fallback setup CRITICAL ERROR: Failed to configure multer. ${setupError.message}`, setupError);
            instance = null; // Ensure instance is null if setup fails
        }
    }
    return instance;
}

// Define uploadImage by calling the setup function immediately
const uploadImage = setupMulter();

// --- Create Router ---
const router = express.Router();

// === Apply Authentication Middleware ===
// Ensures req.user exists for subsequent routes if token is valid
router.use(authMiddleware);

// === Student Profile Routes (Text Data) ===
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);

// === Student Profile Image Routes ===

// Middleware to handle file upload using the configured 'uploadImage' instance
const processImageUpload = (req, res, next) => {
    // Check if multer setup failed earlier
    if (!uploadImage) {
        console.error("Cannot process file upload: Multer 'uploadImage' instance is not available.");
        return res.status(500).json({ message: "Server configuration error: File upload service unavailable." });
    }

    // Execute the actual multer middleware for a single file named 'profileImage'
    uploadImage.single('profileImage')(req, res, (err) => {
        // Now, handle errors *after* multer has tried to process the file
        // 'multer.MulterError' is accessible because 'multer' was required at the top level.
        if (err instanceof multer.MulterError) {
            console.error(`Multer error (${err.code}) for user ${req.user?.userId}:`, err.message);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds the 5MB limit.' });
            }
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        }
        // Handle other potential errors during upload processing
        else if (err) {
            console.error(`Unexpected error during Multer processing for user ${req.user?.userId}:`, err);
            return res.status(500).json({ message: `File upload processing error: ${err.message}` });
        }

        // --- Post-Multer Checks ---
        // Check for validation errors set by our custom fileFilter
        if (req.fileValidationError) {
            console.warn(`File validation error for user ${req.user?.userId}: ${req.fileValidationError}`);
            return res.status(400).json({ message: req.fileValidationError });
        }
        // Check if a file was actually uploaded and accepted (it might be missing if filter rejected it)
        if (!req.file) {
            // If no multer error occurred but req.file is missing, it was likely rejected by the filter
            console.warn(`File missing after Multer processing for user ${req.user?.userId}. Filter likely rejected.`);
            // Use the validation error message if available, otherwise a generic one
            return res.status(400).json({ message: req.fileValidationError || 'No valid image file was uploaded or the file type was rejected.' });
        }

        // If everything is okay (no errors, file exists), proceed to the next handler (the controller)
        next();
    });
};

// POST /api/student/profile/image
router.post(
    '/profile/image',
    processImageUpload, // Use the combined middleware
    uploadStudentProfileImage // The controller function is the final handler
);

// DELETE /api/student/profile/image
router.delete(
    '/profile/image',
    deleteStudentProfileImage // Controller handles logic
);
router.get('/my-subjects', getStudentSubjectsAndMaterials);
// ========================================
//          📝 STUDENT QUIZ ROUTES (NEW)
// ========================================

// Get list of available (published) quizzes for the student
router.get('/quizzes', authMiddleware, getPublishedQuizzesForStudent);
router.get('/quizzes/:quizId/take', authMiddleware, getQuizForTaking);
router.post('/quizzes/:quizId/submit', authMiddleware, submitQuizAttempt);

// ========================================
router.get('/my-attendance', getStudentAttendanceRecords);
router.get('/my-quiz-attempts', getStudentQuizAttempts);
router.get('/dashboard-summary', getStudentDashboardSummary);
module.exports = router; // Export the configured router