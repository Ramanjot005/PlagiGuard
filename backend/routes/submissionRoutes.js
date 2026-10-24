
const express = require("express");
const mongoose = require("mongoose");

const {
  createSubmission,
  getMySubmissions,
  getSubmissionReports,
  gradeSubmission
} = require("../controllers/submissionController");

const {
  protect,
  authorizeRoles
} = require("../middleware/authMiddleware");

const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");

const {
  getPairwiseComparisons,
  analyzeSubmission
} = require("../services/similarityService");

const router = express.Router();

// Student submits an assignment
router.post(
  "/",
  protect,
  authorizeRoles("student"),
  createSubmission
);

// Student views their own submissions
router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  getMySubmissions
);

// Instructor views submission reports
router.get(
  "/reports",
  protect,
  authorizeRoles("instructor"),
  getSubmissionReports
);

// Instructor views pairwise similarity reports
router.get(
  "/reports/pairwise",
  protect,
  authorizeRoles("instructor"),
  async (req, res) => {
    try {
      const comparisons = await getPairwiseComparisons();

      return res.status(200).json({
        success: true,
        count: comparisons.length,
        comparisons
      });
    } catch (error) {
      console.error("Pairwise report error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch similarity reports"
      });
    }
  }
);

// Instructor grades a submission
router.patch(
  "/:id/grade",
  protect,
  authorizeRoles("instructor"),
  gradeSubmission
);

// Instructor views submissions for one assignment
router.get(
  "/assignment/:assignmentId",
  protect,
  authorizeRoles("instructor"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

      if (!mongoose.isValidObjectId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID"
        });
      }

      const assignment = await Assignment.findById(assignmentId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found"
        });
      }

      const submissions = await Submission.find({
        assignment: assignmentId
      })
        .select("-text")
        .populate("student", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: submissions.length,
        submissions
      });
    } catch (error) {
      console.error("Fetch assignment submissions error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch assignment submissions"
      });
    }
  }
);

// Fetch one submission
// Students can only access their own submission
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    const submission = await Submission.findById(id)
      .populate("student", "name email")
      .populate("assignment", "title course maxMarks");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    const studentId = String(
      submission.student?._id || submission.student
    );

    const currentUserId = String(req.user.id || req.user._id);

    if (
      req.user.role === "student" &&
      studentId !== currentUserId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own submission"
      });
    }

    let analysis = null;

    if (req.user.role === "instructor") {
      try {
        analysis = await analyzeSubmission(submission._id);
      } catch (error) {
        console.error("Analysis retrieval failed:", error.message);
      }
    }

    return res.status(200).json({
      success: true,
      submission,
      analysis
    });
  } catch (error) {
    console.error("Fetch submission error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch submission"
    });
  }
});

module.exports = router;
