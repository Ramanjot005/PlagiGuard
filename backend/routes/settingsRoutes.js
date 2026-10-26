const express = require("express");
const {
  getSettings,
  updateSettings
} = require("../controllers/settingsController");

const {
  protect,
  authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/settings - Authenticated users (students & instructors)
router.get("/", protect, getSettings);

// PUT /api/settings - Instructors only
router.put(
  "/",
  protect,
  authorizeRoles("instructor"),
  updateSettings
);

module.exports = router;
