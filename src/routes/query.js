const express = require("express");
const router = express.Router();
const AstraDBVectorStoreService = require("../services/AstraDBVectorStoreService");
const AstraDBQueryService = require("../services/AstraDBQueryService");

// Initialize vector store service
const astraDBVectorStoreService = new AstraDBVectorStoreService();
const astraDBQueryService = new AstraDBQueryService();

const dotenv = require("dotenv");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");

// Load environment variables
dotenv.config();

/**
 * @route POST /api/query/ask
 * @desc Query the knowledge base with a question
 * @access Public
 */
router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Invalid question",
        message: "Please provide a valid question string",
      });
    }

    console.log(`🔍 Processing query: "${question}"`);

    const response = await astraDBQueryService.queryAI(question);

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error processing query:", error);
    res.status(500).json({
      error: "Query processing failed",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * @route GET /api/query/history
 * @desc Get query history (if implemented)
 * @access Public
 */
router.get("/history", async (req, res) => {
  try {
    // TODO: Implement query history tracking
    res.status(200).json({
      success: true,
      message: "Query history endpoint ready for implementation",
      data: [],
    });
  } catch (error) {
    console.error("Error getting query history:", error);
    res.status(500).json({
      error: "Failed to get query history",
      message: error.message,
    });
  }
});

module.exports = router;
