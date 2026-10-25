const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Settings = require("../models/Settings");
const {
  analyzeSubmission,
  getPairwiseComparisons,
  reanalyzeAllSubmissions
} = require("../services/similarityService");

// POST /api/submissions
// Create a submission and run similarity analysis.
const createSubmission = async (req, res) => {
  try {
    const { assignment, filename, text } = req.body;

    if (!mongoose.isValidObjectId(assignment)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid assignment ID"
      });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Submission text is required"
      });
    }

    const assignmentExists = await Assignment.findById(assignment);

    if (!assignmentExists) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    const cleanText = text.trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    // Enforce minimum words setting
    const settings = await Settings.findOne({ key: "global" }).lean();
    const minimumWords = settings?.minimumWords ?? 20;

    if (wordCount < minimumWords) {
      return res.status(400).json({
        success: false,
        message: `Your submission has ${wordCount} words. Minimum required words: ${minimumWords}.`
      });
    }

    const submission = await Submission.create({
      student: req.user.id,
      assignment,
      filename:
        typeof filename === "string" && filename.trim()
          ? filename.trim()
          : "submission.txt",
      text: cleanText,
      wordCount
    });

    let analysis;

    try {
      const analyses = await reanalyzeAllSubmissions();
      analysis = analyses.find(
        result => String(result.submissionId) === String(submission._id)
      );

      if (!analysis) {
        throw new Error("New submission was not included in similarity analysis");
      }
    } catch (error) {
      console.error("Similarity analysis error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Submission was saved, but similarity analysis failed",
        submissionId: submission._id
      });
    }

    const savedSubmission = await Submission.findById(submission._id)
      .select("-text")
      .populate("assignment", "title course dueDate maxMarks");

    return res.status(201).json({
      success: true,
      message: "Submission saved and analyzed successfully",
      submission: savedSubmission,
      analysis
    });
  } catch (error) {
    console.error("Create submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create submission"
    });
  }
};

// GET /api/submissions/my
// Return only the logged-in student's submissions.
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id
    })
      .select("-text")
      .populate("assignment", "title course dueDate maxMarks")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error("Get my submissions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch submissions"
    });
  }
};

// GET /api/submissions/reports
// Return submission records and pairwise similarity comparisons.
const getSubmissionReports = async (req, res) => {
  try {
    const [submissions, comparisons] = await Promise.all([
      Submission.find()
        .select("-text")
        .populate("student", "name email")
        .populate("assignment", "title course maxMarks")
        .sort({ createdAt: -1 })
        .lean(),

      getPairwiseComparisons()
    ]);

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
      comparisons
    });
  } catch (error) {
    console.error("Get submission reports error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch submission reports"
    });
  }
};

const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    if (
      req.user.role === "student" &&
      String(submission.student) !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own submission"
      });
    }

    const body = req.body || {};
    const fields = ["text", "filename"];
    const updates = fields.filter(field =>
      Object.prototype.hasOwnProperty.call(body, field)
    );

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Submission text or filename is required"
      });
    }

    const textChanged = Object.prototype.hasOwnProperty.call(body, "text");

    if (textChanged) {
      if (typeof body.text !== "string" || !body.text.trim()) {
        return res.status(400).json({
          success: false,
          message: "Submission text must be a non-empty string"
        });
      }

      submission.text = body.text.trim();
      submission.wordCount = submission.text.split(/\s+/).filter(Boolean).length;
    }

    if (Object.prototype.hasOwnProperty.call(body, "filename")) {
      if (typeof body.filename !== "string" || !body.filename.trim()) {
        return res.status(400).json({
          success: false,
          message: "Filename must be a non-empty string"
        });
      }

      submission.filename = body.filename.trim();
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
      } catch (error) {
        console.error("Similarity analysis error after submission update:", error.message);
        return res.status(500).json({
          success: false,
          message: "Submission was updated, but similarity analysis failed",
          submissionId: submission._id
        });
      }
    }

    const savedSubmission = await Submission.findById(submission._id)
      .select("-text")
      .populate("assignment", "title course");

    return res.status(200).json({
      success: true,
      message: "Submission updated successfully",
      submission: savedSubmission,
      ...(analysis ? { analysis } : {})
    });
  } catch (error) {
    console.error("Update submission error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Submission update failed",
      ...(error.submissionId ? { submissionId: error.submissionId } : {})
    });
  }
};

// PATCH /api/submissions/:id/grade
// Mark a submission as graded, record marks and feedback.
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    const submission = await Submission.findById(id).populate("assignment", "title maxMarks");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    const { marks, feedback, status } = req.body;

    // Validate marks
    if (
      marks === undefined ||
      marks === null ||
      typeof marks !== "number" ||
      !Number.isFinite(marks)
    ) {
      return res.status(400).json({
        success: false,
        message: "Marks must be a valid number"
      });
    }

    if (marks < 0) {
      return res.status(400).json({
        success: false,
        message: "Marks cannot be negative"
      });
    }

    const maxMarks = submission.assignment?.maxMarks ?? 100;

    if (marks > maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks cannot exceed maximum marks (${maxMarks})`
      });
    }

    // Validate feedback
    if (feedback !== undefined && typeof feedback !== "string") {
      return res.status(400).json({
        success: false,
        message: "Feedback must be text"
      });
    }

    // Validate status if provided
    const allowedStatuses = [
      "submitted",
      "flagged",
      "graded",
      "Marked",
      "Needs Revision",
      "Approved"
    ];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses are: ${allowedStatuses.join(", ")}`
      });
    }

    submission.marks = marks;
    submission.feedback = typeof feedback === "string" ? feedback.trim() : "";
    submission.status = status || "graded";

    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Submission graded successfully",
      submission
    });
  } catch (error) {
    console.error("Grade submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to grade submission"
    });
  }
};

module.exports = {
  createSubmission,
  getMySubmissions,
  getSubmissionReports,
  gradeSubmission,
  updateSubmission
};
