// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
  let token; 
  
  // Check if header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token by splitting the string
      token = req.headers.authorization.split(' ')[1]; // Get the part after 'Bearer '
      
      // Verify the extracted token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach decoded payload (contains userId and userType) to request
      req.user = decoded; 
      
      console.log('Auth Middleware: Token verified, user:', req.user); // Add log for debugging
      next(); // Proceed to the next middleware/route handler
    
    } catch (error) {
      console.error('Auth Middleware Error:', error.message); // Log the specific error
      res.status(401).json({ message: "Token is not valid" });
    }
  } else {
    // Handle case where header is missing or doesn't start with Bearer
    res.status(401).json({ message: "Not authorized, no valid token format" });
  }
};

module.exports = authMiddleware;