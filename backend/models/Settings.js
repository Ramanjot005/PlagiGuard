
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "global"
        },
        ngramSize: {
            type: Number,
            default: 3,
            min: 1,
            max: 10
        },
        similarityThreshold: {
            type: Number,
            default: 30,
            min: 0,
            max: 100
        },
        minimumMatchingNGrams: {
            type: Number,
            default: 3,
            min: 1
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
