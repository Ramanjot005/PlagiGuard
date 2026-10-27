
const express = require("express");
const {
  register,
  login,
  getProfile,
  updateProfile
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Register a new student
router.post("/register", register);

// Log in an existing user
router.post("/login", login);

router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);

module.exports = router;
