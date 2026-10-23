
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    dueDate: {
      type: Date,
      default: null
    },

    maxMarks: {
      type: Number,
      default: 100,
      min: 1
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
