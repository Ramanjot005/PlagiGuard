javascript
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true
    },

    filename: {
      type: String,
      default: "submission.txt"
    },

    text: {
      type: String,
      required: true
    },

    wordCount: {
      type: Number,
      default: 0
    },

    submittedAt: {
      type: Date,
      default: Date.now
    },

    marks: {
      type: Number,
      default: null,
      min: 0
    },

    feedback: {
      type: String,
      default: "",
      trim: true
    },

    markedAt: {
      type: Date,
      default: null
    },

    maxSimilarity: {
      type: Number,
      default: 0
    },

    flagged: {
      type: Boolean,
      default: false
    },

    topMatch: {
      submission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
        default: null
      },
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      similarity: {
        type: Number,
        default: 0
      }
    },

    matchingNGrams: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: [
        "submitted",
        "flagged",
        "graded",
        "Marked",
        "Needs Revision",
        "Approved"
      ],
      default: "submitted"
    },

    analysis: {
      ngramSize: Number,
      analyzedAt: Date
    }
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, submittedAt: -1 });
submissionSchema.index({ student: 1, submittedAt: -1 });
submissionSchema.index({ flagged: 1, maxSimilarity: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
