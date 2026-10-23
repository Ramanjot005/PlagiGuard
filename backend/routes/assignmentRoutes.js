
const express = require("express");
const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const User = require("../models/User");

const router = express.Router();

// Create an assignment
router.post("/", async (req, res) => {
    try {
        const { title, description, createdBy, dueDate } = req.body;

        if (!title || !mongoose.isValidObjectId(createdBy)) {
            return res.status(400).json({
                success: false,
                message: "Valid title and createdBy are required"
            });
        }

        const instructor = await User.findById(createdBy);

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
    }
});

// Get all assignments
router.get("/", async (req, res) => {
    try {
        const assignments = await Assignment.find()
            .sort({ createdAt: -1 })
            .populate("createdBy", "name email");

        return res.json({
            success: true,
            count: assignments.length,
            assignments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get one assignment
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignment ID"
            });
        }

        const assignment = await Assignment.findById(req.params.id)
            .populate("createdBy", "name email");

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        return res.json({ success: true, assignment });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
