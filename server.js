// backend/server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require('path'); // <-- 1. Import the path module

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Initialize Express app
const app = express();

// --- Middleware Setup ---

// Enable CORS for all origins (adjust for production if needed)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// --- Static File Serving for Uploads ---
// Define the absolute path to the uploads directory
const uploadDir = path.join(__dirname, 'uploads');
console.log(`Serving static files from: ${uploadDir}`); // Log the path for verification
// Serve files from the '/uploads' route mapping to the actual 'uploads' directory
app.use('/uploads', express.static(uploadDir)); // <-- 2. Add static file serving

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/teacher", teacherRoutes); // Teacher specific routes (profile, etc.)
app.use("/api/student", studentRoutes);
// Add other routes (admin, student) here as you build them

// --- Server Initialization ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Optional: Add a simple root route for testing server status
app.get('/', (req, res) => {
  res.send('Student Management System API is running!');
});