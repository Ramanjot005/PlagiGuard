const express = require("express");
const mongoose = require("mongoose");

const {
  createSubmission,
  getMySubmissions,
  getSubmissionReports,
  gradeSubmission,
  updateSubmission
} = require("../controllers/submissionController");
const {
  protect,
  authorizeRoles
} = require("../middleware/authMiddleware");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const {
  analyzeSubmission,
  getPairwiseComparisons
} = require("../services/similarityService");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("student"),
  createSubmission
);

router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  getMySubmissions
);

router.get(
  "/reports",
  protect,
  authorizeRoles("instructor"),
  getSubmissionReports
);

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
      console.error("Pairwise similarity report failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to generate similarity report"
      });
    }
  }
);

router.patch(
  "/:id/grade",
  protect,
  authorizeRoles("instructor"),
  gradeSubmission
);

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

      const assignment = await Assignment.findById(assignmentId).select("_id");

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
        .sort({ submittedAt: -1 });

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

router.patch("/:id", protect, updateSubmission);

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
      .populate("assignment", "title course");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    if (
      req.user.role === "student" &&
      submission.student._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own submission"
      });
    }

    let analysis = null;

    if (req.user.role === "instructor") {
      analysis = await analyzeSubmission(submission._id);
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
