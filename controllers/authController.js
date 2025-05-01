// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User"); // Ensure User model path is correct
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Good to have, ensures .env is loaded

exports.signup = async (req, res) => {
  try {
    const { username, email, password, userType } = req.body;

    // Input validation (Basic example)
    if (!username || !email || !password || !userType) {
        return res.status(400).json({ message: "Please provide username, email, password, and user type." });
    }
     // Add more checks like email format, password strength if needed

    const existingUser = await User.findOne({ email: email.toLowerCase() }); // Check lowercase email
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
         username,
         email: email.toLowerCase(), // Save lowercase email
         password: hashedPassword,
         userType
     });
    await newUser.save(); // Mongoose schema validation runs here

    console.log(`Signup successful for email: ${email.toLowerCase()}`);
    res.status(201).json({ success: true, message: "User registered successfully" });

   } catch (error) {
     console.error("!!! Error during signup:", error);
      // Provide more specific error feedback if possible (e.g., validation errors)
     if (error.name === 'ValidationError'){
          return res.status(400).json({ success: false, message: `Validation Error: ${error.message}` });
      }
     res.status(500).json({ success: false, message: "Server Error during registration" });
   }
};

exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    // Input validation
     if (!email || !password || !userType) {
        return res.status(400).json({ message: "Please provide email, password, and user type." });
    }

    const userEmail = email.toLowerCase(); // Search using lowercase

    // Find user by email/type AND explicitly select the password field
    const user = await User.findOne({ email: userEmail, userType }).select('+password'); // <-- Added .select('+password')

    if (!user) {
        console.log(`Login attempt failed: No user found for email ${userEmail} and type ${userType}`);
        // Don't specify *why* it's invalid for security
        return res.status(400).json({ success: false, message: "Invalid Credentials" });
    }

     // Check if password field exists (it should now, due to .select)
     if (!user.password) {
        console.error(`Login failure: User ${userEmail} found but password field is unexpectedly missing!`);
         return res.status(500).json({ success: false, message: "Server Error: Cannot verify credentials" });
      }

    console.log(`Login attempt: Comparing password for user ${user.email}`);
    // Compare submitted password with the hashed password from the database
    const isMatch = await bcrypt.compare(password, user.password); // 'password' is plain text, 'user.password' is hash

    if (!isMatch) {
        console.log(`Login attempt failed: Password mismatch for user ${user.email}`);
         return res.status(400).json({ success: false, message: "Invalid Credentials" }); // Generic message
     }

    // --- Password matches ---
     console.log(`Login successful for user ${user.email}. Generating token...`);

     // Generate JWT
    const token = jwt.sign(
        { userId: user._id, userType: user.userType }, // Payload
        process.env.JWT_SECRET,                      // Secret Key
        { expiresIn: "1h" }                            // Options (e.g., expiration time)
    );

     console.log(`Token generated for userId: ${user._id}`);
     // Send success response with token and userType
    res.json({ success: true, token, userType: user.userType }); // Include userType for frontend redirect

  } catch (error) {
     console.error("!!! Error during login:", error); // Log the actual error on the server
     res.status(500).json({ success: false, message: "Server Error during login" }); // Generic message to client
   }
 };