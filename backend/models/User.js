
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["student", "instructor"],
      required: true,
      default: "student"
    },

    profileImageUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
