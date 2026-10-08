const express = require("express");
const ProductChange = require("../models/productChange");

const router = express.Router();

// POST /api/changes
// Add a new product change
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      changeType,
      version,
      releaseDate,
    } = req.body;

    if (!title || !releaseDate) {
      return res.status(400).json({
        success: false,
        message: "Title and release date are required",
      });
    }

    const change = await ProductChange.create({
      title,
      description,
      changeType,
      version,
      releaseDate,
    });

    console.log("🚀 Product change saved:", change._id);

    res.status(201).json({
      success: true,
      message: "Product change created successfully",
      data: change,
    });

  } catch (error) {
    console.error("❌ Error creating product change:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product change",
      error: error.message,
    });
  }
});


// GET /api/changes
// Get all product changes
router.get("/", async (req, res) => {
  try {
    const changes = await ProductChange.find()
      .sort({ releaseDate: -1 });

    res.json({
      success: true,
      count: changes.length,
      data: changes,
    });

  } catch (error) {
    console.error("❌ Error fetching product changes:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product changes",
      error: error.message,
    });
  }
});


module.exports = router;