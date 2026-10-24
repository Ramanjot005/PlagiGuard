
require("dotenv").config();

const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Assignment = require("./models/Assignment");
const Submission = require("./models/Submission");

const {
    analyzeSubmission,
    getPairwiseComparisons,
    reanalyzeAllSubmissions
} = require("./services/similarityService");

const createdUserIds = [];
const createdAssignmentIds = [];
const createdSubmissionIds = [];

async function runTest() {
    try {
        await connectDB();

        console.log("Connected to MongoDB");

        const runId = randomUUID();

        // Create instructor
        const instructor = await User.create({
            name: "Professor",
            email: `prof-${runId}@test.invalid`,
            passwordHash: "test-password-hash",
            role: "instructor"
        });
        createdUserIds.push(instructor._id);

        // Create two students
        const student1 = await User.create({
            name: "Aditi",
            email: `aditi-${runId}@test.invalid`,
            passwordHash: "test-password-hash",
            role: "student"
        });
        createdUserIds.push(student1._id);

        const student2 = await User.create({
            name: "Rahul",
            email: `rahul-${runId}@test.invalid`,
            passwordHash: "test-password-hash",
            role: "student"
        });
        createdUserIds.push(student2._id);

        // Create assignment
        const assignment = await Assignment.create({
            title: `AI Assignment ${runId}`,
            createdBy: instructor._id
        });
        createdAssignmentIds.push(assignment._id);

        const secondAssignment = await Assignment.create({
            title: `AI Assignment 2 ${runId}`,
            createdBy: instructor._id
        });
        createdAssignmentIds.push(secondAssignment._id);

        // Submission 1
        const sub1 = await Submission.create({
            student: student1._id,
            assignment: assignment._id,
            filename: "aditi.txt",
            text: "Artificial intelligence is transforming education by improving personalized learning and automation.",
            wordCount: 11
        });
        createdSubmissionIds.push(sub1._id);

        // Submission 2 (similar)
        const sub2 = await Submission.create({
            student: student2._id,
            assignment: secondAssignment._id,
            filename: "rahul.txt",
            text: "Artificial intelligence is transforming education by improving personalized learning and automation.",
            wordCount: 11
        });
        createdSubmissionIds.push(sub2._id);

        await analyzeSubmission(sub1._id);

        const analyses = await reanalyzeAllSubmissions();
        const comparisons = await getPairwiseComparisons();
        const firstAnalysis = analyses.find(
            result => String(result.submissionId) === String(sub1._id)
        );
        const secondAnalysis = analyses.find(
            result => String(result.submissionId) === String(sub2._id)
        );
        const crossAssignmentMatch = comparisons.find(
            comparison =>
                (
                    String(comparison.submission1) === String(sub1._id) &&
                    String(comparison.submission2) === String(sub2._id)
                ) ||
                (
                    String(comparison.submission1) === String(sub2._id) &&
                    String(comparison.submission2) === String(sub1._id)
                )
        );

        if (
            !firstAnalysis ||
            !secondAnalysis ||
            !crossAssignmentMatch ||
            crossAssignmentMatch.similarity !== 100 ||
            String(sub1.assignment) === String(sub2.assignment)
        ) {
            throw new Error("Cross-assignment submissions were not compared and re-analyzed");
        }

        console.log("\n========== RESULT ==========");
        console.log("Similarity:", firstAnalysis.maxSimilarity + "%");
        console.log("Flagged:", firstAnalysis.flagged);
        console.log("Top Match:", firstAnalysis.topMatch);
        console.log("Matching N-Grams:", firstAnalysis.matchingNGrams);
        console.log("Re-analyzed submissions:", analyses.length);

        console.log("\nTest completed successfully.");
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            try {
                if (createdSubmissionIds.length) {
                    await Submission.deleteMany({
                        _id: { $in: createdSubmissionIds }
                    });
                }

                if (createdAssignmentIds.length) {
                    await Assignment.deleteMany({
                        _id: { $in: createdAssignmentIds }
                    });
                }

                if (createdUserIds.length) {
                    await User.deleteMany({
                        _id: { $in: createdUserIds }
                    });
                }
            } catch (cleanupError) {
                console.error("Failed to clean up similarity test data:", cleanupError);
                process.exitCode = 1;
            }
        }

        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error("Failed to disconnect from MongoDB:", disconnectError);
            process.exitCode = 1;
        }
    }
}

runTest();
