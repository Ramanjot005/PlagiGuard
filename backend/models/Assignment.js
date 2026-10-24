const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
<<<<<<< HEAD
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        dueDate: {
            type: Date,
            default: null
        },
        maxMarks: {
            type: Number,
            default: 10,
            min: 1
        }
=======
  {
    title: {
      type: String,
      required: true,
      trim: true
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442
    },

    course: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    dueDate: {
      type: Date,
      default: null
    },

    maxMarks: {
      type: Number,
      default: 100,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

assignmentSchema.index({ createdBy: 1, createdAt: -1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
