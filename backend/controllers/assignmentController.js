
const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");

// List assignments.
// Students can see all assignments.
// Instructors can see only their own assignments.
const getAssignments = async (req, res) => {
  try {
    const filter =
      req.user.role === "instructor"
        ? { createdBy: req.user.id }
        : {};

    const assignments = await Assignment.find(filter).sort({
      createdAt: -1
    });

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

// Create an assignment.
const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, maxMarks } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Assignment title is required"
      });
    }

    if (
      dueDate !== undefined &&
      dueDate !== null &&
      (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date"
      });
    }

    if (
      maxMarks !== undefined &&
      (typeof maxMarks !== "number" ||
        !Number.isFinite(maxMarks) ||
        maxMarks < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be a number greater than or equal to 1"
      });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      description:
        typeof description === "string" ? description.trim() : "",
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

// Update an assignment only if the logged-in instructor owns it.
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID"
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own assignments"
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
      (typeof updates.title !== "string" || !updates.title.trim())
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
      updates.dueDate !== undefined &&
      updates.dueDate !== null &&
      (typeof updates.dueDate !== "string" ||
        Number.isNaN(Date.parse(updates.dueDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date"
      });
    }

    if (
      updates.maxMarks !== undefined &&
      (typeof updates.maxMarks !== "number" ||
        !Number.isFinite(updates.maxMarks) ||
        updates.maxMarks < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be a number greater than or equal to 1"
      });
    }

    Object.assign(assignment, updates);
    await assignment.save();

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
