const express = require("express");
const Feedback = require("../models/feedback");
const analyzeFeedback = require("../services/aiAnalyzer");
const synthesizeThemes = require("../services/synthesisService");
const analyzeTrends = require("../services/trendService");
const analyzeCorrelations = require("../services/correlationService");

// Hindsight
const {
  storeFeedbackMemory,
  recallFeedbackMemories,
} = require("../services/hindsightService");

const router = express.Router();


// ==========================================
// POST /api/feedback
// Add and analyze new feedback
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { message, source } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required",
      });
    }

    console.log("📝 New feedback received:", message);

    // Save feedback
    const feedback = await Feedback.create({
      message: message.trim(),
      source: source || "website",
    });

    console.log("💾 Feedback saved:", feedback._id);

    // Analyze with AI
    console.log("🤖 Analyzing feedback with AI...");

    const analysis = await analyzeFeedback(message.trim());

    // Save AI analysis
    if (analysis) {
      feedback.sentiment = analysis.sentiment;
      feedback.sentimentScore = analysis.sentimentScore;
      feedback.theme = analysis.theme;
      feedback.category = analysis.category;
      feedback.severity = analysis.severity;
      feedback.confidence = analysis.confidence;
      feedback.aiAnalysis = analysis.analysis;
      feedback.analyzedAt = new Date();

      await feedback.save();

      console.log("✅ AI analysis saved");

      // ==========================================
      // Store analyzed feedback in Hindsight
      // ==========================================
      await storeFeedbackMemory(
        feedback.message,
        analysis
      );
    } else {
      console.log("⚠️ AI analysis unavailable");
    }

    res.status(201).json({
      success: true,
      message: "Feedback processed successfully",
      data: feedback,
    });

  } catch (error) {
    console.error("❌ Error processing feedback:", error);

    res.status(500).json({
      success: false,
      message: "Failed to process feedback",
      error: error.message,
    });
  }
});


// ==========================================
// GET /api/feedback
// Get all feedback
// ==========================================
router.get("/", async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: feedback.length,
      data: feedback,
    });

  } catch (error) {
    console.error("❌ Error fetching feedback:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
      error: error.message,
    });
  }
});


// ==========================================
// GET /api/feedback/summary
// Get dashboard summary
// ==========================================
router.get("/summary", async (req, res) => {
  try {
    const feedback = await Feedback.find();

    const totalFeedback = feedback.length;

    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    };

    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const themeCounts = {};

    feedback.forEach((item) => {

      // Sentiment count
      if (sentimentCounts[item.sentiment] !== undefined) {
        sentimentCounts[item.sentiment]++;
      }

      // Severity count
      if (severityCounts[item.severity] !== undefined) {
        severityCounts[item.severity]++;
      }

      // Theme count
      if (item.theme && item.theme !== "Uncategorized") {
        themeCounts[item.theme] =
          (themeCounts[item.theme] || 0) + 1;
      }
    });

    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({
        theme,
        count,
      }));

    res.json({
      success: true,
      data: {
        totalFeedback,
        sentimentCounts,
        severityCounts,
        topThemes,
      },
    });

  } catch (error) {
    console.error("❌ Error generating summary:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate summary",
      error: error.message,
    });
  }
});


// ==========================================
// GET /api/feedback/themes
// Synthesize similar feedback into themes
// ==========================================
router.get("/themes", async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 });

    if (feedback.length === 0) {
      return res.json({
        success: true,
        data: {
          themes: [],
        },
      });
    }

    console.log("🧠 Synthesizing feedback themes...");

    const result = await synthesizeThemes(feedback);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Theme synthesis failed",
      });
    }

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("❌ Error synthesizing themes:", error);

    res.status(500).json({
      success: false,
      message: "Failed to synthesize themes",
      error: error.message,
    });
  }
});


// ==========================================
// GET /api/feedback/trends
// Analyze feedback trends over time
// ==========================================
router.get("/trends", async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: 1 });

    if (feedback.length === 0) {
      return res.json({
        success: true,
        data: {
          overallTrend: "stable",
          confidence: 0,
          summary: "No feedback available for trend analysis.",
          trends: [],
        },
      });
    }

    console.log("📈 Analyzing feedback trends...");

    const result = await analyzeTrends(feedback);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Trend analysis failed",
      });
    }

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("❌ Error analyzing trends:", error);

    res.status(500).json({
      success: false,
      message: "Failed to analyze trends",
      error: error.message,
    });
  }
});


// ==========================================
// GET /api/feedback/correlations
// Analyze product change and feedback correlations
// ==========================================
router.get("/correlations", async (req, res) => {
  try {
    const ProductChange = require("../models/productChange");

    const feedback = await Feedback.find()
      .sort({ createdAt: 1 });

    const changes = await ProductChange.find()
      .sort({ releaseDate: 1 });

    if (feedback.length === 0 || changes.length === 0) {
      return res.json({
        success: true,
        data: {
          correlations: [],
        },
      });
    }

    console.log("🔗 Analyzing product change correlations...");

    const result = await analyzeCorrelations(
      feedback,
      changes
    );

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Correlation analysis failed",
      });
    }

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("❌ Error analyzing correlations:", error);

    res.status(500).json({
      success: false,
      message: "Failed to analyze correlations",
      error: error.message,
    });
  }
});
// ==========================================
// GET /api/feedback/memory
// Recall relevant feedback from Hindsight
// ==========================================
router.get("/memory", async (req, res) => {
  try {
    const query =
      req.query.query ||
      "What are the main problems users are reporting?";

    console.log("🧠 Recalling memories from Hindsight...");

    const memories = await recallFeedbackMemories(query);

    res.json({
      success: true,
      query,
      data: memories,
    });

  } catch (error) {
    console.error("❌ Error recalling memories:", error);

    res.status(500).json({
      success: false,
      message: "Failed to recall Hindsight memories",
      error: error.message,
    });
  }
});

module.exports = router;