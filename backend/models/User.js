
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
<<<<<<< HEAD
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
            required: true
        },
        role: {
            type: String,
            enum: ["student", "instructor"],
            required: true,
            default: "student"
        }
=======
  {
    name: {
      type: String,
      required: true,
      trim: true
>>>>>>> 35ecd537aad34605bf47727195fcfbd8c82b8442
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
