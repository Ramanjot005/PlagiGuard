
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

<<<<<<< HEAD
// Create an assignment
router.post("/", async (req, res) => {
    try {
        const { title, description, createdBy, dueDate, maxMarks } = req.body;

        if (
            !title ||
            !mongoose.isValidObjectId(createdBy) ||
            (maxMarks !== undefined &&
                (!Number.isFinite(maxMarks) || maxMarks < 1))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid title, instructor, and maximum marks are required"
            });
        }
=======
// Get all assignments — authenticated users
router.get("/", protect, getAssignments);

// Create assignment — instructors only
router.post(
  "/",
  protect,
  authorizeRoles("instructor"),
  createAssignment
);
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442

// Update assignment — instructors only
router.put(
  "/:id",
  protect,
  authorizeRoles("instructor"),
  updateAssignment
);

<<<<<<< HEAD
        if (!instructor || instructor.role !== "instructor") {
            return res.status(400).json({
                success: false,
                message: "Valid instructor not found"
            });
        }

        const assignment = await Assignment.create({
            title,
            description,
            createdBy,
            ...(maxMarks !== undefined ? { maxMarks } : {}),
            ...(dueDate ? { dueDate } : {})
        });

        return res.status(201).json({
            success: true,
            message: "Assignment created successfully",
            assignment
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
=======
// Get one assignment — authenticated users
router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID"
      });
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442
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
