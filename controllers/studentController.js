// backend/controllers/studentController.js
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @desc    Get logged-in student's profile
 * @route   GET /api/student/profile
 * @access  Private (Student)
 */
const getStudentProfile = async (req, res) => {
    console.log(`---> GET /api/student/profile for Student ID: ${req.user?.userId}`);
    try {
        const studentId = req.user.userId;
        if (!studentId) return res.status(401).json({ message: "Auth Error: ID missing" });
        if (req.user.userType !== 'student') return res.status(403).json({ message: "Forbidden" });

        const studentProfile = await User.findById(studentId).select('-password'); // Exclude password
        if (!studentProfile) return res.status(404).json({ message: 'Profile not found' });

        console.log(`<--- Sending profile for Student ID: ${studentId}`);
        res.status(200).json(studentProfile);

    } catch (error) {
        console.error("!!! Error in getStudentProfile:", error);
        res.status(500).json({ message: "Server error fetching profile" });
    }
};

/**
 * @desc    Update logged-in student's profile
 * @route   PUT /api/student/profile
 * @access  Private (Student)
 * @body    { profileData: { field1: value1, ... } } // Send ONLY fields student can edit
 */
const updateStudentProfile = async (req, res) => {
    console.log(`---> PUT /api/student/profile for Student ID: ${req.user?.userId}`);
    try {
        const studentId = req.user.userId;
        const { profileData } = req.body; // Data nested under 'profileData'

        if (!studentId) return res.status(401).json({ message: "Auth Error" });
        if (req.user.userType !== 'student') return res.status(403).json({ message: "Forbidden" });
        if (!profileData || typeof profileData !== 'object' || Object.keys(profileData).length === 0) {
            return res.status(400).json({ message: "Profile data missing/invalid." });
        }

        // --- Prepare update object with dot notation ---
        const updateFields = {};
        // Define fields students ARE allowed to edit:
        const allowedFields = [
             'firstName', 'lastName', 'phone', 'dob', 'gender', 'bloodGroup', 'nationality',
             'address', 'city', 'state', 'zipCode', 'requestedClassName', // <<< INCLUDE THIS
             'fatherName', 'fatherOccupation', 'fatherPhone', 'motherName', 'motherOccupation', 'motherPhone',
             'guardianName', 'guardianRelation', 'guardianPhone',
             'medicalConditions', 'allergies', 'regularMedications',
             'transportRequired', 'transportRoute', 'hostelRequired'
        ];

        for (const key of allowedFields) {
            // Only include field in update if it was present in the submitted profileData
            if (profileData.hasOwnProperty(key)) {
                 // Handle booleans explicitly if necessary depending on frontend library
                 if (key === 'transportRequired' || key === 'hostelRequired') {
                      updateFields[`profile.${key}`] = Boolean(profileData[key]);
                  } else if (key === 'dob' && !profileData[key]){ // Prevent saving empty string as date
                     updateFields[`profile.${key}`] = null; // Store null if DOB cleared
                  }
                 else {
                      updateFields[`profile.${key}`] = profileData[key];
                  }
             }
        }

        // Auto-update fullName if firstName or lastName changed
        if (profileData.firstName || profileData.lastName) {
             updateFields['profile.fullName'] = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
         }
        // ----------------------------------------------

        if (Object.keys(updateFields).length === 0){
            return res.status(400).json({ message: "No valid fields provided for update." });
        }

        console.log("--- Prepared update fields:", updateFields);

        // Find user and update using $set with specific fields
        const updatedStudent = await User.findByIdAndUpdate(
            studentId,
            { $set: updateFields }, // Use $set with prepared dot-notation fields
            { new: true, runValidators: true, context: 'query' } // Ensure validators run
        ).select('-password'); // Exclude password from result

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student update failed.' });
        }

        console.log("<--- Student profile updated successfully:", studentId);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedStudent // Send back updated user data
        });

    } catch (error) {
        console.error(`!!! Error updating profile for student ${req.user?.userId}:`, error);
        if (error.name === 'ValidationError') { return res.status(400).json({ message: `Validation Error: ${Object.values(error.errors).map(e => e.message).join('. ')}` }); }
        if (error.code === 11000) { return res.status(400).json({ message: `Update failed: Duplicate value.` }); } // More specific msg needed based on index
        res.status(500).json({ message: "Server error updating profile." });
    }
};

module.exports = {
    getStudentProfile,
    updateStudentProfile,
};