// backend/routes/teacherRoutes.js
const express = require('express');
const {
    getTeacherProfile,
    updateTeacherProfile,
    uploadProfileImage,
    deleteProfileImage,
    changePassword,
    getTeacherClasses,
    createTeacherClass,
    updateTeacherClass,
    deleteTeacherClass,
    getStudentsForClass,
    deleteStudentFromClass,
    addSubjectToClass,
    getSubjectsForClass,
    uploadMaterial,
    getMaterials,
    deleteMaterial,
    uploadSyllabusFile,
    getSyllabi,
    deleteSyllabusFile,
    downloadSyllabusFile,
    getStudentProfileForTeacher, 
    fetchAttendanceForDate, // <-- ADD Import
    saveAttendance, 
    getClassAttendanceReport, 
    uploadImage,
    uploadDocument,
    createQuiz,          // <-- ADDED
    getQuizzesByTeacher,
    updateQuizStatus,  // <-- ADDED
    deleteQuiz,
    getQuizResults
  } = require('../controllers/teacherController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// === Profile Routes ===
router.get('/profile', authMiddleware, getTeacherProfile);
router.put('/profile', authMiddleware, updateTeacherProfile);

// === Profile Image Routes ===
router.post(
  '/profile/image',
  authMiddleware,
  uploadImage.single('profileImage'),
  uploadProfileImage
);
router.delete(
    '/profile/image',
    authMiddleware,
    deleteProfileImage
);

// === Password Change Route ===
router.post('/change-password', authMiddleware, changePassword);

// // === Student Management Routes (Top Level) ===
// router.post('/students', authMiddleware, addStudentToClass);


// === Class Management Routes ===
router.get('/classes', authMiddleware, getTeacherClasses);
router.post('/classes', authMiddleware, createTeacherClass);
router.put('/classes/:classId', authMiddleware, updateTeacherClass);
router.delete('/classes/:classId', authMiddleware, deleteTeacherClass);

// === Student Management Routes (within a Class) ===
router.get('/classes/:classId/students', authMiddleware, getStudentsForClass);
router.delete('/classes/:classId/students/:studentId', authMiddleware, deleteStudentFromClass);
// ADD route for viewing a specific student's profile
router.get('/students/:studentId/profile', authMiddleware, getStudentProfileForTeacher); // <-- ADD THIS ROUTE
// === Subject Management Routes (within a Class) ===
router.post('/classes/:classId/subjects', authMiddleware, addSubjectToClass); // Add a subject
router.get('/classes/:classId/subjects', authMiddleware, getSubjectsForClass); // Get subjects for a class
// Note: Routes for UPDATING or DELETING a subject's NAME are not yet defined here, only adding/getting subjects.

// --- Syllabus Routes (Multiple Files) ---
router.post(
    '/classes/:classId/subjects/:subjectId/syllabi',
    authMiddleware,
    uploadDocument.single('syllabusFile'),
    uploadSyllabusFile
);
router.get(
    '/classes/:classId/subjects/:subjectId/syllabi',
    authMiddleware,
    getSyllabi
);
router.delete(
    '/classes/:classId/subjects/:subjectId/syllabi/:syllabusId',
    authMiddleware,
    deleteSyllabusFile
);
router.get(
    '/classes/:classId/subjects/:subjectId/syllabi/:syllabusId/download', // Download route for specific syllabus file
    authMiddleware,
    downloadSyllabusFile
);

// --- Material Routes ---
router.post(
    '/classes/:classId/subjects/:subjectId/materials',
    authMiddleware,
    uploadDocument.single('materialFile'),
    uploadMaterial
);
router.get('/classes/:classId/subjects/:subjectId/materials', authMiddleware, getMaterials);
router.delete('/classes/:classId/subjects/:subjectId/materials/:materialId', authMiddleware, deleteMaterial);
// TODO: Add Material Download Route here later

// --- Attendance Routes (Simplified) ---
// GET status for marking view (query params: classId, date)
router.get('/attendance', authMiddleware, fetchAttendanceForDate);
// POST save marked attendance (body: classId, date, attendance obj)
router.post('/attendance', authMiddleware, saveAttendance);

// --- Attendance Report Route ---
// GET report for specific class and date (query param: date)
router.get('/attendance/reports/class/:classId', authMiddleware, getClassAttendanceReport);       // Save marked attendance
// ========================================
//          📝 QUIZ ROUTES (NEW)
// ========================================
// Using '/quizzes' as the base path, applying auth middleware to ensure only logged-in users can access
router.post('/quizzes', authMiddleware, createQuiz);
router.get('/quizzes', authMiddleware, getQuizzesByTeacher);
router.put('/quizzes/:quizId/status', authMiddleware, updateQuizStatus);
router.delete('/quizzes/:quizId', authMiddleware, deleteQuiz);
router.get('/quizzes/:quizId/results', authMiddleware, getQuizResults);
// --- Future routes ---
// router.get('/quizzes/:quizId', authMiddleware, getQuizDetails);     // Get details of one quiz
// router.put('/quizzes/:quizId', authMiddleware, updateQuiz);        // Update a quiz
// router.delete('/quizzes/:quizId', authMiddleware, deleteQuiz);     // Delete a quiz
// router.get('/quizzes/:quizId/results', authMiddleware, getQuizResults); // View results (later)
// router.post('/quizzes/:quizId/results', authMiddleware, saveExamResults); // Route for saving marks/results (using existing name for now) - REVISIT THIS
// router.get('/quizzes/:quizId/students-for-marking', authMiddleware, getStudentsAndResultsForExam); // Route for getting students/marks for marking - REVISIT THIS
module.exports = router;