
const Submission = require("../models/Submission");
const Settings = require("../models/Settings");

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

function createNGrams(tokens, n = 3) {
    const grams = new Set();

    for (let i = 0; i <= tokens.length - n; i++) {
        grams.add(tokens.slice(i, i + n).join(" "));
    }

    return grams;
}

function calculateJaccard(setA, setB) {
    const intersection = [...setA].filter(
        gram => setB.has(gram)
    );

    const union = new Set([...setA, ...setB]);

    const score = union.size === 0
        ? 0
        : (intersection.length / union.size) * 100;

    return {
        score: Number(score.toFixed(2)),
        matchingNGrams: intersection
    };
}

async function getAnalysisSettings() {
    const settings = await Settings.findOne({
        key: "global"
    }).lean();

    const analysisSettings = {
        ngramSize: settings?.ngramSize ?? 3,
        similarityThreshold:
            settings?.similarityThreshold ?? 30,
        minimumMatchingNGrams:
            settings?.minimumMatchingNGrams ?? 3
    };

    if (
        !Number.isInteger(analysisSettings.ngramSize) ||
        analysisSettings.ngramSize < 1 ||
        analysisSettings.ngramSize > 10 ||
        !Number.isFinite(analysisSettings.similarityThreshold) ||
        analysisSettings.similarityThreshold < 0 ||
        analysisSettings.similarityThreshold > 100 ||
        !Number.isInteger(analysisSettings.minimumMatchingNGrams) ||
        analysisSettings.minimumMatchingNGrams < 1
    ) {
        throw new Error("Invalid similarity analysis settings");
    }

    return analysisSettings;
}

async function analyzeSubmission(submissionId) {
    const current = await Submission.findById(submissionId);

    if (!current) {
        throw new Error("Submission not found");
    }

    const settings = await getAnalysisSettings();
    const n = settings.ngramSize;

    const currentGrams = createNGrams(
        tokenize(current.text),
        n
    );

    const others = await Submission.find({
        _id: { $ne: current._id },
        student: { $ne: current.student }
    }).select("_id student text");

    let bestMatch = null;
    let bestScore = 0;
    let bestNGrams = [];

    for (const other of others) {
        const otherGrams = createNGrams(
            tokenize(other.text),
            n
        );

        const result = calculateJaccard(
            currentGrams,
            otherGrams
        );

        if (result.score > bestScore) {
            bestScore = result.score;
            bestMatch = other;
            bestNGrams = result.matchingNGrams;
        }
    }

    const flagged =
        bestScore >= settings.similarityThreshold &&
        bestNGrams.length >= settings.minimumMatchingNGrams;

    current.maxSimilarity = bestScore;
    current.flagged = flagged;

    current.topMatch = {
        submission: bestMatch?._id ?? null,
        student: bestMatch?.student ?? null,
        similarity: bestScore
    };

    current.matchingNGrams = bestNGrams;

    current.analysis = {
        ngramSize: n,
        analyzedAt: new Date()
    };

    if (current.status !== "graded") {
        current.status = flagged ? "flagged" : "submitted";
    }

    await current.save();

    return {
        submissionId: current._id,
        maxSimilarity: bestScore,
        flagged,
        topMatch: current.topMatch,
        matchingNGrams: bestNGrams
    };
}

async function getPairwiseComparisons() {
    const settings = await getAnalysisSettings();
    const n = settings.ngramSize;

    const submissions = await Submission.find({})
        .select("_id student assignment text")
        .lean();

    const comparisons = [];

    for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
            const first = submissions[i];
            const second = submissions[j];

            if (
                String(first.student) === String(second.student)
            ) {
                continue;
            }

            const gramsA = createNGrams(
                tokenize(first.text), n
            );

            const gramsB = createNGrams(
                tokenize(second.text), n
            );

            const result = calculateJaccard(gramsA, gramsB);

            comparisons.push({
                submission1: first._id,
                submission2: second._id,
                student1: first.student,
                student2: second.student,
                assignment1: first.assignment,
                assignment2: second.assignment,
                similarity: result.score,
                matchingNGrams: result.matchingNGrams,
                flagged:
                    result.score >= settings.similarityThreshold &&
                    result.matchingNGrams.length >= settings.minimumMatchingNGrams
            });
        }
    }

    return comparisons.sort(
        (a, b) => b.similarity - a.similarity
    );
}

async function reanalyzeAllSubmissions() {
    const submissions = await Submission.find({})
        .select("_id")
        .lean();

    const results = [];

    for (const submission of submissions) {
        results.push(
            await analyzeSubmission(submission._id)
        );
    }

    return results;
}

module.exports = {
    tokenize,
    createNGrams,
    calculateJaccard,
    getAnalysisSettings,
    analyzeSubmission,
    getPairwiseComparisons,
    reanalyzeAllSubmissions
};
