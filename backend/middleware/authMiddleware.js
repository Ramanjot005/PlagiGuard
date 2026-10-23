
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==================== AUTHENTICATION ====================
// Checks whether the user has a valid JWT token.
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a token."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error"
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check that the user still exists in MongoDB
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found"
      });
    }

    // Store the current database user on the request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// ==================== ROLE AUTHORIZATION ====================
// Allows only the specified roles to access a route.
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // protect must run before authorizeRoles
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };
