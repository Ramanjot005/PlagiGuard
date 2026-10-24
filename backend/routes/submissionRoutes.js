
const express = require("express");
const mongoose = require("mongoose");

const Submission = require("../models/Submission");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const {
    getPairwiseComparisons,
    reanalyzeAllSubmissions
} = require("../services/similarityService");

const router = express.Router();

// Create a submission
router.post("/", async (req, res) => {
    try {
        const {
            student,
            assignment,
            filename,
            text
        } = req.body;

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
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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

        if (!mongoose.isValidObjectId(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignment ID"
            });
        }

        const submissions = await Submission.find({
            assignment: assignmentId
        })
            .select("-text")
            .populate("student", "name email")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: submissions.length,
            submissions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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

        const submission = await Submission.findById(req.params.id)
            .populate("student", "name email")
            .populate("assignment", "title");

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });
        }

        return res.json({ success: true, submission });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
