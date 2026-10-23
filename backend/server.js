
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const {
  protect,
  authorizeRoles
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PlagiGuard backend is running"
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// POST /api/auth/register
// POST /api/auth/login
app.use("/api/auth", authRoutes);

// ==================== ASSIGNMENT ROUTES ====================

// GET    /api/assignments
// POST   /api/assignments
// PUT    /api/assignments/:id
app.use("/api/assignments", assignmentRoutes);

// ==================== SUBMISSION ROUTES ====================

// POST  /api/submissions
// GET   /api/submissions/my
// GET   /api/submissions/reports
// PATCH /api/submissions/:id/grade
app.use("/api/submissions", submissionRoutes);

// ==================== PROTECTED TEST ROUTE ====================

app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You accessed a protected route successfully",
    user: req.user
  });
});

// ==================== STUDENT-ONLY TEST ROUTE ====================

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

// ==================== INSTRUCTOR-ONLY TEST ROUTE ====================

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

// ==================== UNKNOWN ROUTES ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// ==================== START SERVER ====================

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `PlagiGuard backend running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

startServer();
