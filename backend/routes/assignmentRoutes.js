
const express = require("express");

const {
  getAssignments,
  createAssignment,
  updateAssignment
} = require("../controllers/assignmentController");

const {
  protect,
  authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

// Any logged-in user can view assignments
router.get("/", protect, getAssignments);

// Only instructors can create assignments
router.post(
  "/",
  protect,
  authorizeRoles("instructor"),
  createAssignment
);

// Only instructors can update assignments
router.put(
  "/:id",
  protect,
  authorizeRoles("instructor"),
  updateAssignment
);

module.exports = router;
