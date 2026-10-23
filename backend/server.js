require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const assignmentRoutes = require("./routes/assignmentRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/users", userRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PlagiGuard backend is running"
  });
});

// API routes
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// Start server after MongoDB connects
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`PlagiGuard backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();