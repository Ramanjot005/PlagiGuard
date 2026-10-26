require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const {
  protect,
  authorizeRoles
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PlagiGuard backend is running"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/settings", settingsRoutes);

// Protected test route
app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You accessed a protected route successfully",
    user: req.user
  });
});

// Student-only test route
app.get(
  "/api/student/dashboard",
  protect,
  authorizeRoles("student"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Student dashboard accessed successfully",
      user: req.user
    });
  }
);

// Instructor-only test route
app.get(
  "/api/instructor/dashboard",
  protect,
  authorizeRoles("instructor"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Instructor dashboard accessed successfully",
      user: req.user
    });
  }
);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `PlagiGuard backend running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
