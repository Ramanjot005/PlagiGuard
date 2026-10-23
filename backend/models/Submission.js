
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
            enum: ["submitted", "flagged", "graded"],
            default: "submitted"
        },
        analysis: {
            ngramSize: Number,
            analyzedAt: Date
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
