
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Assignment = require("./models/Assignment");
const Submission = require("./models/Submission");
const Settings = require("./models/Settings");

const { analyzeSubmission } = require("./services/similarityService");

async function runTest() {
    try {
        await connectDB();

        console.log("Connected to MongoDB");

        // Clean old test data
        await User.deleteMany({});
        await Assignment.deleteMany({});
        await Submission.deleteMany({});
        await Settings.deleteMany({});

        // Insert default settings
        await Settings.create({
            key: "global",
            ngramSize: 3,
            similarityThreshold: 30,
            minimumMatchingNGrams: 3
        });

        // Create instructor
        const instructor = await User.create({
            name: "Professor",
            email: "prof@test.com",
            password: "hashedpassword",
            role: "instructor"
        });

        // Create two students
        const student1 = await User.create({
            name: "Aditi",
            email: "aditi@test.com",
            password: "hashedpassword",
            role: "student"
        });

        const student2 = await User.create({
            name: "Rahul",
            email: "rahul@test.com",
            password: "hashedpassword",
            role: "student"
        });

        // Create assignment
        const assignment = await Assignment.create({
            title: "AI Assignment",
            createdBy: instructor._id
        });

        // Submission 1
        const sub1 = await Submission.create({
            student: student1._id,
            assignment: assignment._id,
            filename: "aditi.txt",
            text: "Artificial intelligence is transforming education by improving personalized learning and automation.",
            wordCount: 11
        });

        // Submission 2 (similar)
        await Submission.create({
            student: student2._id,
            assignment: assignment._id,
            filename: "rahul.txt",
            text: "Artificial intelligence is transforming education through personalized learning and automation.",
            wordCount: 10
        });

        // Analyze first submission
        const result = await analyzeSubmission(sub1._id);

        console.log("\n========== RESULT ==========");
        console.log("Similarity:", result.maxSimilarity + "%");
        console.log("Flagged:", result.flagged);
        console.log("Top Match:", result.topMatch);
        console.log("Matching N-Grams:", result.matchingNGrams);

        await mongoose.disconnect();

        console.log("\nTest completed successfully.");
    } catch (err) {
        console.error(err);
    }
}

runTest();
