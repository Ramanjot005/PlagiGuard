
const express = require("express");

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

const router = express.Router();

// Students submit assignments and view their own submissions.
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

// Instructors view reports and grade submissions.
router.get(
  "/reports",
  protect,
  authorizeRoles("instructor"),
  getSubmissionReports
);

router.patch(
  "/:id/grade",
  protect,
  authorizeRoles("instructor"),
  gradeSubmission
);

module.exports = router;
