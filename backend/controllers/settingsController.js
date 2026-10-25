const Settings = require("../models/Settings");

// GET /api/settings
// Retrieve the global analysis settings, creating defaults if not present.
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: "global" });

    if (!settings) {
      settings = await Settings.create({
        key: "global",
        ngramSize: 3,
        similarityThreshold: 30,
        minimumMatchingNGrams: 3,
        minimumWords: 20
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
      settings
    });
  } catch (error) {
    console.error("Get settings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch settings"
    });
  }
};

// PUT /api/settings
// Update analysis settings (instructors only).
const updateSettings = async (req, res) => {
  try {
    const { ngramSize, similarityThreshold, minimumWords, minimumMatchingNGrams } = req.body;
    const updates = {};

    if (ngramSize !== undefined) {
      const parsedNgram = Number(ngramSize);
      if (!Number.isInteger(parsedNgram) || parsedNgram < 1 || parsedNgram > 10) {
        return res.status(400).json({
          success: false,
          message: "N-gram size must be an integer between 1 and 10"
        });
      }
      updates.ngramSize = parsedNgram;
    }

    if (similarityThreshold !== undefined) {
      const parsedThreshold = Number(similarityThreshold);
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
        return res.status(400).json({
          success: false,
          message: "Similarity threshold must be a number between 0 and 100"
        });
      }
      updates.similarityThreshold = parsedThreshold;
    }

    if (minimumWords !== undefined) {
      const parsedMinWords = Number(minimumWords);
      if (!Number.isInteger(parsedMinWords) || parsedMinWords < 5 || parsedMinWords > 5000) {
        return res.status(400).json({
          success: false,
          message: "Minimum words must be an integer between 5 and 5000"
        });
      }
      updates.minimumWords = parsedMinWords;
    }

    if (minimumMatchingNGrams !== undefined) {
      const parsedMinGrams = Number(minimumMatchingNGrams);
      if (!Number.isInteger(parsedMinGrams) || parsedMinGrams < 1) {
        return res.status(400).json({
          success: false,
          message: "Minimum matching N-grams must be a positive integer"
        });
      }
      updates.minimumMatchingNGrams = parsedMinGrams;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one setting to update"
      });
    }

    const settings = await Settings.findOneAndUpdate(
      { key: "global" },
      { $set: updates },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
      settings
    });
  } catch (error) {
    console.error("Update settings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update settings"
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
