
const mongoose = require("mongoose");

// GET /api/submissions/my
const getMySubmissions = async (req, res) => {
  try {
    // The Submission model will be connected when Person 3's
    // model and agreed schema are available.
    return res.status(501).json({
      success: false,
      message: "Submission model integration is pending"
    });
  } catch (error) {
    console.error("Get my submissions error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch submissions"
    });
  }
};

// POST /api/submissions
const createSubmission = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: "Submission model integration is pending"
    });
  } catch (error) {
    console.error("Create submission error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create submission"
    });
  }
};

// GET /api/submissions/reports
const getSubmissionReports = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: "Submission model and similarity integration are pending"
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
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    return res.status(501).json({
      success: false,
      message: "Submission model integration is pending"
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
