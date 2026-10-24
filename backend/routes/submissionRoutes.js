
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
<<<<<<< HEAD
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const {
    getPairwiseComparisons,
    reanalyzeAllSubmissions
} = require("../services/similarityService");
=======
const { analyzeSubmission } = require("../services/similarityService");
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442

const router = express.Router();

// Student submits an assignment.
// The controller must validate the logged-in student's identity.
router.post(
  "/",
  protect,
  authorizeRoles("student"),
  createSubmission
);

// Student views their own submissions.
router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  getMySubmissions
);

// Instructor views submission reports.
router.get(
  "/reports",
  protect,
  authorizeRoles("instructor"),
  getSubmissionReports
);

// Instructor grades a submission.
router.patch(
  "/:id/grade",
  protect,
  authorizeRoles("instructor"),
  gradeSubmission
);

// Instructor views submissions for a particular assignment.
router.get(
  "/assignment/:assignmentId",
  protect,
  authorizeRoles("instructor"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

<<<<<<< HEAD
        if (
            !mongoose.isValidObjectId(student) ||
            !mongoose.isValidObjectId(assignment) ||
            typeof text !== "string" ||
            !text.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid student, assignment and non-empty text are required"
            });
        }

        const [studentExists, assignmentExists] = await Promise.all([
            User.findOne({ _id: student, role: "student" }),
            Assignment.findById(assignment)
        ]);

        if (!studentExists) {
            return res.status(400).json({
                success: false,
                message: "Student not found"
            });
        }

        if (!assignmentExists) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        const cleanText = text.trim();

        const submission = await Submission.create({
            student,
            assignment,
            filename: filename || "submission.txt",
            text: cleanText,
            wordCount: cleanText.split(/\s+/).length,
            submittedAt: new Date()
=======
      if (!mongoose.isValidObjectId(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID"
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442
        });
      }

<<<<<<< HEAD
        let analysis;

        try {
            const analyses = await reanalyzeAllSubmissions();
            analysis = analyses.find(
                result => String(result.submissionId) === String(submission._id)
            );

            if (!analysis) {
                throw new Error("New submission was not included in similarity analysis");
            }
        } catch (analysisError) {
            console.error("Similarity analysis failed:", analysisError);
            return res.status(500).json({
                success: false,
                message: "Submission was saved, but similarity analysis failed",
                submissionId: submission._id
            });
        }

        const savedSubmission = await Submission.findById(submission._id);

        return res.status(201).json({
            success: true,
            message: "Submission saved successfully",
            submission: savedSubmission,
            analysis
        });
=======
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
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442
    } catch (error) {
      console.error("Fetch assignment submissions error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch assignment submissions"
      });
    }
  }
);

<<<<<<< HEAD
// Get pairwise similarity reports across all assignments.
router.get("/reports/pairwise", async (req, res) => {
    try {
        const comparisons = await getPairwiseComparisons();

        return res.json({
            success: true,
            count: comparisons.length,
            comparisons
        });
    } catch (error) {
        console.error("Pairwise similarity report failed:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get submissions for an assignment
router.get("/assignment/:assignmentId", async (req, res) => {
    try {
        const { assignmentId } = req.params;
=======
// Fetch one submission and its analysis.
// Students may only access their own submission.
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

<<<<<<< HEAD
// Update a submission and refresh comparisons when its text changes.
router.patch("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid submission ID"
            });
        }

        const submission = await Submission.findById(req.params.id);

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });
        }

        const body = req.body || {};
        const { text, filename, marks, feedback, status } = body;
        const hasUpdates = [
            "text",
            "filename",
            "marks",
            "feedback",
            "status"
        ].some(field => Object.prototype.hasOwnProperty.call(body, field));

        if (!hasUpdates) {
            return res.status(400).json({
                success: false,
                message: "At least one supported submission field is required"
            });
        }

        const textChanged = Object.prototype.hasOwnProperty.call(body, "text");

        if (textChanged) {
            if (typeof text !== "string" || !text.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Submission text must be a non-empty string"
                });
            }

            submission.text = text.trim();
            submission.wordCount = submission.text.split(/\s+/).length;
        }

        if (Object.prototype.hasOwnProperty.call(body, "filename")) {
            if (typeof filename !== "string" || !filename.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Filename must be a non-empty string"
                });
            }

            submission.filename = filename.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, "marks")) {
            if (
                marks !== null &&
                (!Number.isFinite(marks) || marks < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Marks must be a non-negative number or null"
                });
            }

            if (marks !== null) {
                const assignment = await Assignment.findById(submission.assignment)
                    .select("maxMarks");

                if (assignment && marks > assignment.maxMarks) {
                    return res.status(400).json({
                        success: false,
                        message: "Marks cannot exceed the assignment maximum"
                    });
                }
            }

            submission.marks = marks;
            submission.markedAt = marks === null ? null : new Date();
        }

        if (Object.prototype.hasOwnProperty.call(body, "feedback")) {
            if (typeof feedback !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Feedback must be a string"
                });
            }

            submission.feedback = feedback.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, "status")) {
            if (!["submitted", "flagged", "graded"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be submitted, flagged or graded"
                });
            }

            submission.status = status;
        }

        await submission.save();

        let analysis;

        if (textChanged) {
            try {
                const analyses = await reanalyzeAllSubmissions();
                analysis = analyses.find(
                    result => String(result.submissionId) === String(submission._id)
                );

                if (!analysis) {
                    throw new Error("Updated submission was not included in similarity analysis");
                }
            } catch (analysisError) {
                console.error("Similarity analysis failed after submission update:", analysisError);
                return res.status(500).json({
                    success: false,
                    message: "Submission was updated, but similarity analysis failed",
                    submissionId: submission._id
                });
            }
        }

        const savedSubmission = await Submission.findById(submission._id);

        return res.json({
            success: true,
            message: "Submission updated successfully",
            submission: savedSubmission,
            ...(analysis ? { analysis } : {})
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get one submission by ID
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid submission ID"
            });
        }
=======
    const submission = await Submission.findById(id)
      .populate("student", "name email")
      .populate("assignment", "title");
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442

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
