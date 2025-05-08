// backend/controllers/studentController.js
const User = require('../models/User');
const Class = require('../models/Class'); // <-- Import Class model
const Quiz = require('../models/Quiz'); // <-- ADD THIS LINE
const QuizAttempt = require('../models/QuizAttempt'); // Ensure this is added if needed
const mongoose = require('mongoose');
const fs = require('fs').promises; // Use promise-based fs for async/await
const path = require('path');

// Define upload directory path (should be consistent across controllers needing it)
// Adjust the path based on your project structure relative to this controller file
const uploadDir = path.join(__dirname, '..', 'uploads');

/**
 * @desc    Get logged-in student's profile
 * @route   GET /api/student/profile
 * @access  Private (Student)
 */
const getStudentProfile = async (req, res) => {
    console.log(`---> GET /api/student/profile requested by User ID: ${req.user?.userId}, Type: ${req.user?.userType}`);
    try {
        // Ensure only students can access their profile via this route
        if (req.user.userType !== 'student') {
            console.warn(`Access denied for user type: ${req.user.userType}`);
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        const studentId = req.user.userId;
        const studentProfile = await User.findById(studentId).select('-password'); // Exclude password

        if (!studentProfile) {
            console.warn(`Profile not found for Student ID: ${studentId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        console.log(`<--- Sending profile for Student ID: ${studentId}`);
        res.status(200).json(studentProfile);

    } catch (error) {
        console.error(`!!! Error in getStudentProfile for student ${req.user?.userId}:`, error);
        res.status(500).json({ message: "Server error fetching profile" });
    }
};

/**
 * @desc    Update logged-in student's profile (Text Data Only)
 * @route   PUT /api/student/profile
 * @access  Private (Student)
 * @body    { profileData: { field1: value1, ... } }
 */
const updateStudentProfile = async (req, res) => {
    console.log(`---> PUT /api/student/profile requested by User ID: ${req.user?.userId}, Type: ${req.user?.userType}`);
    try {
        const studentId = req.user.userId;
        const { profileData } = req.body;

        // Authorize: Ensure it's a student making the request
        if (req.user.userType !== 'student') {
             console.warn(`Access denied for user type: ${req.user.userType}`);
            return res.status(403).json({ message: "Forbidden: Only students can update their profile." });
        }

        // Validate payload
        if (!profileData || typeof profileData !== 'object' || Object.keys(profileData).length === 0) {
            console.warn(`Invalid profileData received for student ${studentId}:`, profileData);
            return res.status(400).json({ message: "Profile data payload missing or invalid." });
        }

        // --- Prepare update object using dot notation for nested 'profile' fields ---
        const updateFields = {};
        // Define fields students ARE allowed to edit via this endpoint:
        // ** Ensure this list matches your StudentEditProfile.jsx form fields **
        const allowedFields = [
            'firstName', 'lastName', 'phone', 'dob', 'gender', 'bloodGroup', 'nationality',
            'address', 'city', 'state', 'zipCode', 'requestedClassName',
            'fatherName', 'fatherOccupation', 'fatherPhone', 'motherName', 'motherOccupation', 'motherPhone',
            'guardianName', 'guardianRelation', 'guardianPhone',
            'medicalConditions', 'allergies', 'regularMedications',
            'transportRequired', 'transportRoute', 'hostelRequired'
            // EXCLUDED: email, password, userType, rollNumber, admissionDate, currentGrade, profilePic etc.
        ];

        // Populate updateFields only with allowed fields present in profileData
        for (const key of allowedFields) {
            if (profileData.hasOwnProperty(key)) {
                // Handle booleans explicitly
                if (key === 'transportRequired' || key === 'hostelRequired') {
                    updateFields[`profile.${key}`] = Boolean(profileData[key]);
                }
                // Handle empty date - store as null
                else if (key === 'dob' && !profileData[key]) {
                    updateFields[`profile.${key}`] = null;
                }
                // Trim strings if needed, or handle other type conversions
                else if (typeof profileData[key] === 'string') {
                    updateFields[`profile.${key}`] = profileData[key].trim();
                }
                 else {
                    updateFields[`profile.${key}`] = profileData[key];
                }
            }
        }

        // If no valid fields were provided for update
        if (Object.keys(updateFields).length === 0) {
             console.warn(`No valid fields provided for update by student ${studentId}. Payload:`, profileData);
            return res.status(400).json({ message: "No valid profile fields provided for update. Image must be updated separately." });
        }

        console.log(`--- Updating student ${studentId} profile with fields:`, updateFields);

        // Find user and update using $set
        // Mongoose's 'findByIdAndUpdate' with 'runValidators: true' should trigger schema validation
        // and the pre-save hook for 'fullName' if set up correctly in User.js
        const updatedStudent = await User.findByIdAndUpdate(
            studentId,
            { $set: updateFields },
            { new: true, runValidators: true, context: 'query' } // Return updated doc, run validators
        ).select('-password'); // Exclude password from the returned object

        if (!updatedStudent) {
            console.error(`Student update failed - User not found after update operation for ID: ${studentId}`);
            // This is unlikely if the user is authenticated, but handle it.
            return res.status(404).json({ success: false, message: 'Student update failed (User not found?).' });
        }

        console.log(`<--- Student profile updated successfully for ID: ${studentId}`);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedStudent // Send back the updated user object
        });

    } catch (error) {
        console.error(`!!! Error updating text profile for student ${req.user?.userId}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message).join('. ');
            return res.status(400).json({ success: false, message: `Validation Error: ${messages}` });
        }
        if (error.code === 11000) {
            // Determine which field caused the duplicate error if possible
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ success: false, message: `Update failed: A duplicate value occurred for field '${field}'.` });
        }
        res.status(500).json({ success: false, message: "Server error updating profile." });
    }
};

/**
 * @desc    Upload/Update student profile image
 * @route   POST /api/student/profile/image
 * @access  Private (Student)
 */
const uploadStudentProfileImage = async (req, res) => {
    console.log(`---> POST /api/student/profile/image requested by User ID: ${req.user?.userId}, Type: ${req.user?.userType}`);
    try {
        const studentId = req.user.userId;

        // Authorize: Ensure it's a student
        if (req.user.userType !== 'student') {
            console.warn(`Access denied for user type: ${req.user.userType}`);
            return res.status(403).json({ message: "Forbidden" });
        }

        // Check if file exists on req (processed by multer middleware)
        if (!req.file) {
            console.warn(`File missing in request for student ${studentId}.`);
            return res.status(400).json({ success: false, message: 'No image file uploaded or file rejected.' });
        }
        console.log(`--- File uploaded for student ${studentId}:`, req.file);

        // --- Get existing path for deleting old file ---
        const existingUser = await User.findById(studentId).select('profile.profilePic').lean(); // Use lean for read-only
        const oldImagePath = existingUser?.profile?.profilePic; // Path relative to server root (e.g., /uploads/...)

        // Construct the web-accessible URL path for the new image
        const newFilePath = `/uploads/${req.file.filename}`; // Relative path for client/DB storage
        console.log(`--- New image path generated for student ${studentId}: ${newFilePath}`);

        // --- Update Database ---
        const updatedUser = await User.findByIdAndUpdate(
            studentId,
            { $set: { 'profile.profilePic': newFilePath } },
            { new: true } // Return the updated document
        ).select('profile.profilePic'); // Select only the field we care about

        if (!updatedUser || !updatedUser.profile) {
            console.error(`!!! DB update failed for profilePic for student ID: ${studentId}.`);
            // Attempt cleanup of the newly uploaded file since DB update failed
            try {
                await fs.unlink(req.file.path); // Use req.file.path (absolute path from multer)
                console.log(`Cleaned up orphaned new file ${req.file.filename} due to DB update failure.`);
            } catch (cleanupError) {
                console.error(`Error cleaning up orphaned new file ${req.file.filename}:`, cleanupError);
            }
            return res.status(500).json({ success: false, message: 'Failed to update profile picture path in database.' });
        }

        console.log(`<--- Successfully updated profilePic in DB for student ${studentId}: ${updatedUser.profile.profilePic}`);

        // --- Delete the OLD image file (AFTER successful DB update) ---
        if (oldImagePath && oldImagePath !== newFilePath && oldImagePath.startsWith('/uploads/')) {
            const oldFilename = path.basename(oldImagePath); // Extract filename from relative path
            const absoluteOldPath = path.join(uploadDir, oldFilename); // Construct absolute path
            console.log(`--- Attempting to delete old image file: ${absoluteOldPath}`);
            try {
                await fs.unlink(absoluteOldPath);
                console.log(`--- Successfully deleted old file: ${absoluteOldPath}`);
            } catch (unlinkError) {
                if (unlinkError.code === 'ENOENT') {
                    console.log(`--- Old file ${absoluteOldPath} not found, likely already deleted.`);
                } else {
                    // Log error but don't fail the request, as the main goal (upload) succeeded
                    console.error(`Error deleting old file ${absoluteOldPath}:`, unlinkError);
                }
            }
        }

        // Send success response with the new path
        res.status(200).json({ success: true, profilePic: newFilePath });

    } catch (error) {
        console.error(`!!! Error in uploadStudentProfileImage for student ${req.user?.userId}:`, error);
        // Attempt to delete the newly uploaded file if an error occurred at any point after upload
        if (req.file?.path) {
            try {
                await fs.unlink(req.file.path);
                console.log(`Cleaned up uploaded file ${req.file.filename} due to error.`);
            } catch (cleanupError) {
                console.error(`Error cleaning up uploaded file ${req.file.filename} on error:`, cleanupError);
            }
        }
        res.status(500).json({ success: false, message: 'Server error uploading image' });
    }
};

/**
 * @desc    Remove student profile image
 * @route   DELETE /api/student/profile/image
 * @access  Private (Student)
 */
const deleteStudentProfileImage = async (req, res) => {
    console.log(`---> DELETE /api/student/profile/image requested by User ID: ${req.user?.userId}, Type: ${req.user?.userType}`);
    try {
        const studentId = req.user.userId;

        // Authorize: Ensure it's a student
        if (req.user.userType !== 'student') {
             console.warn(`Access denied for user type: ${req.user.userType}`);
            return res.status(403).json({ message: "Forbidden" });
        }

        // Find user to get the current image path *before* updating DB
        const user = await User.findById(studentId).select('profile.profilePic');
        if (!user) {
            // If user doesn't exist (unlikely for authenticated route), consider it success
             console.warn(`User not found for ID: ${studentId} during image deletion attempt.`);
            return res.status(200).json({ success: true, message: 'User not found, image link effectively removed.' });
        }

        const currentImagePath = user.profile?.profilePic; // Relative path (e.g., /uploads/...)
        console.log(`--- Current profilePic path for student ${studentId}: ${currentImagePath}`);

        // --- Update DB: Set profilePic to null ---
        if (currentImagePath === null) {
            console.log("--- ProfilePic is already null in DB. No DB update needed.");
        } else {
            const updatedUser = await User.findByIdAndUpdate(
                studentId,
                { $set: { 'profile.profilePic': null } },
                { new: true } // Get updated doc, though not strictly necessary here
            );
            if (!updatedUser) {
                 console.error(`!!! Failed to update DB (set profilePic to null) for Student ID: ${studentId}.`);
                 // Do not proceed with file deletion if DB update failed
                 return res.status(500).json({ success: false, message: 'Database update failed while removing image link.' });
            }
            console.log(`<--- Successfully updated DB (profilePic: null) for student ${studentId}.`);
        }

        // --- Delete the actual file from the filesystem ---
        if (currentImagePath && currentImagePath.startsWith('/uploads/')) {
            const filename = path.basename(currentImagePath); // Extract filename
            const absolutePathToDelete = path.join(uploadDir, filename); // Construct absolute path
            console.log(`--- Attempting to delete file from server: ${absolutePathToDelete}`);
            try {
                await fs.unlink(absolutePathToDelete);
                console.log(`--- Successfully deleted file: ${absolutePathToDelete}`);
            } catch (unlinkError) {
                if (unlinkError.code === 'ENOENT') {
                     console.log(`--- File ${absolutePathToDelete} not found, likely already deleted.`);
                } else {
                     // Log error but still return success as DB update worked
                     console.error(`!!! Error deleting file ${absolutePathToDelete}:`, unlinkError);
                }
            }
        } else {
             console.log(`--- No valid current image path found for student ${studentId} or path was null, skipping file deletion.`);
        }

        res.status(200).json({ success: true, message: 'Profile image removed successfully' });

    } catch (error) {
        console.error(`!!! Error removing profile image for student ${req.user?.userId}:`, error);
        res.status(500).json({ success: false, message: 'Server error removing image' });
    }
};
/**
 * @desc    Get aggregated subjects, materials, and syllabi for the student's class
 * @route   GET /api/student/my-subjects
 * @access  Private (Student)
 */
const getStudentSubjectsAndMaterials = async (req, res) => {
    console.log(`---> GET /api/student/my-subjects requested by User ID: ${req.user?.userId}`);
    try {
        const studentId = req.user.userId;

        // 1. Fetch student data to find their class name
        const student = await User.findById(studentId).select('profile.requestedClassName profile.currentGrade'); // Adjust fields as needed
        if (!student) {
            return res.status(404).json({ message: "Student profile not found." });
        }

        // *** Determine the authoritative class name ***
        // Prioritize 'requestedClassName', fallback to 'currentGrade', or add 'assignedClassName' later
        const studentClassName = student.profile?.requestedClassName || student.profile?.currentGrade;

        if (!studentClassName || typeof studentClassName !== 'string' || studentClassName.trim() === '') {
            console.warn(`Student ${studentId} does not have a valid class name assigned.`);
             // Return empty array if no class name - they can't see subjects yet
             return res.status(200).json([]);
            // Or return an error:
            // return res.status(400).json({ message: "Your class assignment is not set. Cannot fetch subjects." });
        }
        console.log(`--- Fetching subjects for class name: "${studentClassName}" for student ${studentId}`);

        // 2. Find ALL Class documents matching the student's class name
        const relevantClasses = await Class.find({ name: studentClassName.trim() })
                                            // Select only necessary fields
                                            .select('subjects name teacher') // Include teacher if needed later
                                            .lean(); // Use lean for performance

        if (!relevantClasses || relevantClasses.length === 0) {
            console.log(`--- No classes found with name "${studentClassName}"`);
            return res.status(200).json([]); // No classes found for this name, return empty
        }
        console.log(`--- Found ${relevantClasses.length} class document(s) matching "${studentClassName}"`);

        // 3. Aggregate Subjects, Materials, and Syllabi
        const aggregatedSubjects = new Map(); // Use a Map for unique subjects by name (case-insensitive)

        relevantClasses.forEach(cls => {
            (cls.subjects || []).forEach(subject => {
                const subjectKey = subject.name.trim().toLowerCase(); // Key for uniqueness
                const subjectName = subject.name.trim(); // Original name for display

                if (!aggregatedSubjects.has(subjectKey)) {
                    // Initialize if new subject found
                    aggregatedSubjects.set(subjectKey, {
                        // Add subject _id if needed? Might be tricky if multiple teachers add same subject
                        // _id: subject._id, // Could be ambiguous
                        name: subjectName,
                        materials: [],
                        syllabi: []
                    });
                }

                // Get the entry for this subject
                const currentSubjectData = aggregatedSubjects.get(subjectKey);

                // Add materials from this class's subject instance (prevent duplicates by path)
                const existingMaterialPaths = new Set(currentSubjectData.materials.map(m => m.path));
                (subject.materials || []).forEach(material => {
                    if (!existingMaterialPaths.has(material.path)) {
                         currentSubjectData.materials.push(material);
                         existingMaterialPaths.add(material.path); // Add path to set
                    }
                });

                // Add syllabi from this class's subject instance (prevent duplicates by path)
                 const existingSyllabiPaths = new Set(currentSubjectData.syllabi.map(s => s.path));
                 (subject.syllabi || []).forEach(syllabus => {
                    if (!existingSyllabiPaths.has(syllabus.path)) {
                         currentSubjectData.syllabi.push(syllabus);
                         existingSyllabiPaths.add(syllabus.path); // Add path to set
                    }
                });

            });
        });

        // Convert Map values to an array for the response
        const finalSubjectList = Array.from(aggregatedSubjects.values());

        // Sort the final list alphabetically by subject name
         finalSubjectList.sort((a, b) => a.name.localeCompare(b.name));

        console.log(`<--- Sending ${finalSubjectList.length} aggregated subjects for student ${studentId}`);
        res.status(200).json(finalSubjectList);

    } catch (error) {
        console.error(`!!! Error in getStudentSubjectsAndMaterials for student ${req.user?.userId}:`, error);
        res.status(500).json({ message: "Server error fetching subjects and materials." });
    }
};

/**
 * @desc    Get Published Quizzes for Student's Enrolled Class(es)
 * @route   GET /api/student/quizzes
 * @access  Private (Student)
 */
const getPublishedQuizzesForStudent = async (req, res) => {
    const studentId = req.user?.userId;
    console.log(`---> GET /api/student/quizzes requested by Student ${studentId}`);

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(401).json({ message: "Authentication error." });
    }

    try {
        // 1. Find the student and get their assigned class NAME
        // Prioritize requestedClassName, fallback to currentGrade, or use another field if available
        const student = await User.findById(studentId)
                                  .select('profile.requestedClassName profile.currentGrade')
                                  .lean();

        if (!student || !student.profile) {
            console.warn(`Student ${studentId} or their profile not found.`);
            return res.status(404).json({ message: "Student profile not found." });
        }

        // *** Determine the authoritative class name for the student ***
        const studentClassName = student.profile.requestedClassName?.trim() || student.profile.currentGrade?.trim();

        if (!studentClassName) {
            console.log(`Student ${studentId} does not have requestedClassName or currentGrade set.`);
            // Return empty if no class name identified for the student
            return res.status(200).json([]);
        }
        console.log(`--- Student ${studentId} identified with Class Name: "${studentClassName}"`);

        // 2. Find ALL Class document IDs that match this name
        const matchingClassDocs = await Class.find({ name: studentClassName })
                                             .select('_id') // Only need the IDs
                                             .lean();

        if (!matchingClassDocs || matchingClassDocs.length === 0) {
            console.log(`--- No Class documents found with name "${studentClassName}".`);
            return res.status(200).json([]); // No classes match the name, so no quizzes
        }

        // Extract the ObjectIds from the found class documents
        const matchingClassIds = matchingClassDocs.map(cls => cls._id);
        console.log(`--- Found ${matchingClassIds.length} Class IDs matching name "${studentClassName}":`, matchingClassIds.map(id => id.toString()));

        // 3. Find Published quizzes where classId is one of the matching IDs
        const now = new Date();
        const query = {
            classId: { $in: matchingClassIds }, // Use the IDs found by name matching
            status: 'Published',
            // Keep date filters commented out for now for easier debugging
            // $or: [ { publishDate: null }, { publishDate: { $lte: now } } ],
            // $or: [ { dueDate: null }, { dueDate: { $gte: now } } ]
        };
        console.log("--- Backend Query for Student Quizzes (by Name):", JSON.stringify(query));

        const quizzes = await Quiz.find(query)
            .select('-questions.correctAnswerIndex') // Exclude answers
            .populate('classId', 'name')             // Populate actual class name
            .sort({ createdAt: -1 })
            .lean();

        console.log(`--- Found ${quizzes.length} PUBLISHED quizzes matching student's class name "${studentClassName}".`);
        if (quizzes.length > 0) {
            console.log("--- First found quiz sample:", JSON.stringify(quizzes[0]));
        }

        res.status(200).json(quizzes); // Send the result

    } catch (error) {
        console.error(`!!! Error fetching quizzes for student ${studentId} by class name:`, error);
        res.status(500).json({ message: "Server error fetching available quizzes." });
    }
};


/**
 * @desc    Get a Specific Quiz for Student to Take (No Answers)
 * @route   GET /api/student/quizzes/:quizId/take
 * @access  Private (Student)
 */
const getQuizForTaking = async (req, res) => {
    const { quizId } = req.params;
    const studentId = req.user?.userId;
    console.log(`---> GET /api/student/quizzes/${quizId}/take requested by Student ${studentId}`);

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
        return res.status(400).json({ message: "Invalid Quiz ID format." });
    }
    if (!studentId) return res.status(401).json({ message: "Authentication error." });

    try {
        // 1. Find the student's enrolled classes
        const student = await User.findById(studentId).select('enrolledClasses').lean();
        if (!student) return res.status(404).json({ message: "Student not found." });

        // 2. Find the specific quiz, ensure it's published and check dates
        const now = new Date();
        const quiz = await Quiz.findOne({
            _id: quizId,
            status: 'Published',
             $or: [ { publishDate: null }, { publishDate: { $lte: now } } ],
             $or: [ { dueDate: null }, { dueDate: { $gte: now } } ]
        })
        // Select fields needed for taking the quiz, EXCLUDING correct answers
        .select('title description classId subjectId subjectName teacherId questions._id questions.questionText questions.options timeLimitMinutes')
        .lean();

        if (!quiz) {
            console.warn(`Published Quiz ${quizId} not found or outside active dates.`);
            return res.status(404).json({ message: "Quiz not found, is not published, or is outside the available dates." });
        }

        // // 3. Verify the student is enrolled in the quiz's class
        // const isEnrolled = student.enrolledClasses.some(enrolledClassId => enrolledClassId.equals(quiz.classId));
        // if (!isEnrolled) {
        //      console.warn(`Student ${studentId} attempted to access quiz ${quizId} for class ${quiz.classId} they are not enrolled in.`);
        //     return res.status(403).json({ message: "Access denied: You are not enrolled in the class for this quiz." });
        // }

        // 4. Check if student already attempted this quiz (if only one attempt allowed)
        const existingAttempt = await QuizAttempt.findOne({ quizId: quizId, studentId: studentId }).select('_id');
        if (existingAttempt) {
             console.log(`Student ${studentId} already attempted quiz ${quizId}.`);
            return res.status(403).json({ message: "You have already submitted this quiz.", attemptId: existingAttempt._id });
        }

        console.log(`<--- Sending quiz details (without answers) for ${quizId} to student ${studentId}`);
        res.status(200).json(quiz);

    } catch (error) {
        console.error(`!!! Error fetching quiz ${quizId} for student ${studentId}:`, error);
        res.status(500).json({ message: "Server error fetching quiz details." });
    }
};

/**
 * @desc    Submit Student's Answers for a Quiz
 * @route   POST /api/student/quizzes/:quizId/submit
 * @access  Private (Student)
 * @body    { answers: [{ questionId: string, selectedOptionIndex: number }], startTime?: ISOString }
 */
const submitQuizAttempt = async (req, res) => {
    const { quizId } = req.params;
    const studentId = req.user?.userId;
    const { answers, startTime } = req.body;

    console.log(`---> POST /api/student/quizzes/${quizId}/submit by Student ${studentId}`);
    // ... (keep validation for input) ...
    if (!mongoose.Types.ObjectId.isValid(quizId)) { /* return 400 */ }
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) { /* return 401 */ }
    if (!Array.isArray(answers)) { /* return 400 */ }

    try {
        // 1. Check if already attempted
        const existingAttempt = await QuizAttempt.findOne({ quizId: quizId, studentId: studentId }).select('_id').lean();
        if (existingAttempt) {
            console.warn(`--- [Submit Quiz ${quizId}] Found existing attempt: ${existingAttempt._id}.`);
            return res.status(403).json({ message: "You have already submitted this quiz." });
        }

        // 2. Get the Quiz details WITH answers, status, and TEACHER ID
        console.log(`--- [Submit Quiz ${quizId}] Fetching quiz details with answers & teacher...`);
        const quiz = await Quiz.findById(quizId)
                             // *** FIX: Added 'teacher' to select ***
                             .select('questions status classId subjectId teacher')
                             .lean(); // Use lean for performance

        if (!quiz) { /* handle quiz not found - return 404 */ }
        console.log(`--- [Submit Quiz ${quizId}] Found quiz. Status: ${quiz.status}, Teacher: ${quiz.teacher}`);

        // *** Check Status ***
        if (quiz.status !== 'Published') { /* return 403 */ }

        // 3. Grade the answers
        const totalQuestions = quiz.questions.length;
        if (totalQuestions === 0) { return res.status(400).json({ message: "Cannot submit results for empty quiz." }); }
        let score = 0;
        const gradedAnswers = answers.map(studentAnswer => {
            const question = quiz.questions.find(q => q._id.equals(studentAnswer.questionId));
            let isCorrect = false;
            if (question && question.correctAnswerIndex === studentAnswer.selectedOptionIndex) {
                score++;
                isCorrect = true;
            }
            // Ensure required fields for subdocument are present
            if (!mongoose.Types.ObjectId.isValid(studentAnswer.questionId) || typeof studentAnswer.selectedOptionIndex !== 'number') {
                console.warn(`Invalid answer structure received:`, studentAnswer);
                // Handle invalid answer structure - maybe skip or throw error?
                 // For now, we'll save it but mark as incorrect if structure is bad
                 isCorrect = false; // Ensure incorrect if data is bad
            }
            return {
                questionId: mongoose.Types.ObjectId.isValid(studentAnswer.questionId) ? studentAnswer.questionId : null, // Handle potential invalid ID
                selectedOptionIndex: typeof studentAnswer.selectedOptionIndex === 'number' ? studentAnswer.selectedOptionIndex : -1, // Handle potential invalid index
                isCorrect: isCorrect,
            };
        }).filter(a => a.questionId !== null && a.selectedOptionIndex !== -1); // Filter out completely invalid answer structures

        // Ensure number of graded answers matches expectation if needed
         if (gradedAnswers.length !== answers.length) {
            console.warn("Some answers had invalid structure and were filtered out.");
            // Decide if this should be an error or just proceed
         }


        // 4. Calculate Percentage and Time Taken
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        const submittedAt = new Date();
        let timeTakenSeconds = null;
        if (startTime) { try { /* calculate time */ } catch(e){ /* ignore */ } }

        // 5. Create and Save the QuizAttempt document
        const newAttempt = new QuizAttempt({
            quizId,
            studentId, // Use the ObjectId from req.user
            classId: quiz.classId,
            subjectId: quiz.subjectId,
            // *** FIX: Use quiz.teacher which holds the teacher's ObjectId ***
            teacherId: quiz.teacher, // Ensure schema field name 'teacherId' matches QuizAttempt model
            answers: gradedAnswers,
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
            submittedAt: submittedAt,
            startedAt: startTime ? new Date(startTime) : submittedAt,
            timeTakenSeconds: timeTakenSeconds,
        });

        console.log("--- [Submit Quiz] Attempting to save QuizAttempt:", newAttempt);
        await newAttempt.save(); // Save the attempt
        console.log(`<--- Quiz attempt saved successfully for student ${studentId}, quiz ${quizId}. Score: ${score}/${totalQuestions}`);

        // 6. Return the results to the student
        res.status(201).json({
            message: "Quiz submitted successfully!",
            attemptId: newAttempt._id,
            score: newAttempt.score,
            totalQuestions: newAttempt.totalQuestions,
            percentage: newAttempt.percentage,
            // quizTitle: quiz.title // Fetch title separately if needed, wasn't selected
        });

    } catch (error) {
        // ... (keep existing catch block) ...
        console.error(`!!! Error submitting quiz ${quizId} for student ${studentId}:`, error);
        if (error.code === 11000) { return res.status(403).json({ message: "Submission failed: Duplicate attempt detected." }); }
        if (error.name === 'ValidationError') {
             console.error("--- Mongoose Validation Errors (QuizAttempt) ---:", error.errors);
             const messages = Object.values(error.errors).map(e => e.message).join('. ');
             return res.status(400).json({ message: `Submission Error: ${messages}` });
        }
        res.status(500).json({ message: "Server error processing your submission." });
    }
};



// --- Export all controller functions ---
module.exports = {
    getStudentProfile,
    updateStudentProfile,
    uploadStudentProfileImage,
    deleteStudentProfileImage,
    getStudentSubjectsAndMaterials,
    getPublishedQuizzesForStudent, // <-- ADDED
    getQuizForTaking,             // <-- ADDED
    submitQuizAttempt  
};