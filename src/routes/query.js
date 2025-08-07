const express = require("express");
const router = express.Router();
const AstraDBVectorStoreService = require("../services/AstraDBVectorStoreService");
const AstraDBQueryService = require("../services/AstraDBQueryService");
const { asyncHandler, ValidationError, NotFoundError } = require("../middleware/errorHandler");

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
router.post("/ask", asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    throw new ValidationError("Please provide a valid question string");
  }

  if (question.trim().length === 0) {
    throw new ValidationError("Question cannot be empty");
  }

  console.log(`🔍 Processing query: "${question}"`);

  const response = await astraDBQueryService.queryAI(question, 10);

  if (!response || !response.answer) {
    throw new NotFoundError("No relevant information found for your question");
  }

  return res.status(200).json({
    success: true,
    data: response,
    requestId: req.id
  });
}));

/**
 * @route GET /api/query/history
 * @desc Get query history (if implemented)
 * @access Public
 */
router.get("/history", asyncHandler(async (req, res) => {
  // TODO: Implement query history tracking
  res.status(200).json({
    success: true,
    message: "Query history endpoint ready for implementation",
    data: [],
    requestId: req.id
  });
}));

module.exports = router;
