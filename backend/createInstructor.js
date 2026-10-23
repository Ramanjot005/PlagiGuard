
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createInstructor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "testinstructor@plagiguard.local";
    const password = "InstructorTest123!";

    const passwordHash = await bcrypt.hash(password, 12);

    let user = await User.findOne({ email }).select("+passwordHash");

    if (user) {
      user.name = "Test Instructor";
      user.passwordHash = passwordHash;
      user.role = "instructor";
      await user.save();
      console.log("Test instructor updated.");
    } else {
      await User.create({
        name: "Test Instructor",
        email,
        passwordHash,
        role: "instructor"
      });
      console.log("Test instructor created.");
    }

    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createInstructor();
