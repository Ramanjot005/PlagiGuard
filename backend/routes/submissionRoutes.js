
const express = require("express");
const mongoose = require("mongoose");

const Submission = require("../models/Submission");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const { analyzeSubmission } = require("../services/similarityService");

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
            wordCount: cleanText.split(/\s+/).length
        });

        let analysis = null;

        try {
            analysis = await analyzeSubmission(submission._id);
        } catch (analysisError) {
            console.error("Similarity analysis failed:", analysisError.message);
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
