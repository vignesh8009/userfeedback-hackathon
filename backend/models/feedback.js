const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },

    source: {
      type: String,
      enum: ["website", "app", "email", "social", "survey", "csv", "other"],
      default: "website",
    },

    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral", "mixed"],
      default: "neutral",
    },

    sentimentScore: {
      type: Number,
      default: 0,
    },

    theme: {
      type: String,
      default: "Uncategorized",
      trim: true,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    aiAnalysis: {
      type: String,
      default: "",
    },

    analyzedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Feedback",
  feedbackSchema,
  "feedback"
);