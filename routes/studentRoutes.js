// backend/routes/studentRoutes.js
const express = require('express');
const {
    getStudentProfile,
    updateStudentProfile
} = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// === Student Profile Routes ===
router.use(authMiddleware); // Apply auth to all routes below

router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);

module.exports = router;