
const express = require("express");
const mongoose = require("mongoose");

const {
  getAssignments,
  createAssignment,
  updateAssignment
} = require("../controllers/assignmentController");

const {
  protect,
  authorizeRoles
} = require("../middleware/authMiddleware");

const Assignment = require("../models/Assignment");

const router = express.Router();

// Get all assignments — authenticated users
router.get("/", protect, getAssignments);

// Create assignment — instructors only
router.post(
  "/",
  protect,
  authorizeRoles("instructor"),
  createAssignment
);

// Update assignment — instructors only
router.put(
  "/:id",
  protect,
  authorizeRoles("instructor"),
  updateAssignment
);

// Get one assignment — authenticated users
router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID"
      });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    return res.status(200).json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error("Get assignment error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch assignment"
    });
  }
});

module.exports = router;
