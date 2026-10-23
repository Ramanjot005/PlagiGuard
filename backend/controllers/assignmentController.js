
const mongoose = require("mongoose");

// Import the model that Person 3 will create.
// We will connect this file once Assignment.js is available.
const Assignment = require("../models/Assignment");

// GET /api/assignments
// List assignments
const getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error("Get assignments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assignments"
    });
  }
};

// POST /api/assignments
// Create an assignment
const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, maxMarks } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Assignment title is required"
      });
    }

    if (
      dueDate &&
      Number.isNaN(Date.parse(dueDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date"
      });
    }

    if (
      maxMarks !== undefined &&
      (!Number.isFinite(maxMarks) || maxMarks <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be a positive number"
      });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      dueDate: dueDate || null,
      maxMarks: maxMarks ?? 100,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: assignment
    });
  } catch (error) {
    console.error("Create assignment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create assignment"
    });
  }
};

// PUT /api/assignments/:id
// Update an assignment
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID"
      });
    }

    const allowedFields = [
      "title",
      "description",
      "dueDate",
      "maxMarks"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    if (
      updates.title !== undefined &&
      (
        typeof updates.title !== "string" ||
        !updates.title.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Assignment title cannot be empty"
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (
      updates.description !== undefined &&
      typeof updates.description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be text"
      });
    }

    if (
      updates.dueDate &&
      Number.isNaN(Date.parse(updates.dueDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date"
      });
    }

    if (
      updates.maxMarks !== undefined &&
      (!Number.isFinite(updates.maxMarks) || updates.maxMarks <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be a positive number"
      });
    }

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment
    });
  } catch (error) {
    console.error("Update assignment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update assignment"
    });
  }
};

module.exports = {
  getAssignments,
  createAssignment,
  updateAssignment
};
