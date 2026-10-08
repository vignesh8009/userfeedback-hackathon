const mongoose = require("mongoose");

const productChangeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    changeType: {
      type: String,
      enum: [
        "feature",
        "bug_fix",
        "ui_update",
        "performance",
        "security",
        "other",
      ],
      default: "other",
    },

    version: {
      type: String,
      default: "",
      trim: true,
    },

    releaseDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ProductChange",
  productChangeSchema,
  "productChanges"
);