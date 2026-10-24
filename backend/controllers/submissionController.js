
const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const {
  analyzeSubmission,
  getPairwiseComparisons
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

    let analysis = null;
    let analysisWarning = null;

    try {
      analysis = await analyzeSubmission(submission._id);
    } catch (error) {
      console.error("Similarity analysis error:", error.message);
      analysisWarning =
        "Submission saved, but similarity analysis could not be completed.";
    }

    const savedSubmission = await Submission.findById(submission._id)
      .select("-text")
      .populate("assignment", "title");

    return res.status(201).json({
      success: true,
      message: analysisWarning
        ? "Submission saved successfully"
        : "Submission saved and analyzed successfully",
      submission: savedSubmission,
      analysis,
      warning: analysisWarning
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
      .populate("assignment", "title dueDate maxMarks")
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
        .populate("assignment", "title")
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

// PATCH /api/submissions/:id/grade
// Mark a submission as graded.
const gradeSubmission = async (req, res) => {
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

    submission.status = "graded";
    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Submission marked as graded",
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
  gradeSubmission
};
