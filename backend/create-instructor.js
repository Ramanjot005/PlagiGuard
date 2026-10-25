
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

async function createInstructor() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const name = "Test Instructor";
    const email = "instructor@plagiguard.com";
    const password = "Instructor@123";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Account already exists:", existingUser.email);
      console.log("Current role:", existingUser.role);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "instructor"
    });

    console.log("Instructor account created:", user.email);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createInstructor();
