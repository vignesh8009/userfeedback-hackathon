const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/feedbackSynthesizer";

// Import routes
const feedbackRoutes = require("./routes/feedbackRoutes");
const productChangeRoutes = require("./routes/productChangeRoutes");

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/feedback", feedbackRoutes);
app.use("/api/changes", productChangeRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "User Feedback Synthesizer server is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on http://localhost:${PORT}/api/health`
      );
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
    process.exit(1);
  });