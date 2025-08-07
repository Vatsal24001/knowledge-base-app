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
 * @route POST /api/query/ask-stream
 * @desc Stream AI response for a question
 * @access Public
 */
router.post("/ask-stream", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Invalid question",
        message: "Please provide a valid question string",
      });
    }

    console.log(`🔍 Processing streaming query: "${question}"`);

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type":"connected","message":"Streaming connection established"}\n\n');

    let metadata = null;

    try {
      metadata = await astraDBQueryService.queryAIStream(question, (chunk) => {
        // Send chunk data as Server-Sent Event
        const data = JSON.stringify({
          type: chunk.type,
          content: chunk.content,
          timestamp: new Date().toISOString()
        });
        res.write(`data: ${data}\n\n`);
      });

      // Send final metadata
      const finalData = JSON.stringify({
        type: 'complete',
        metadata: metadata,
        timestamp: new Date().toISOString()
      });
      res.write(`data: ${finalData}\n\n`);

    } catch (streamError) {
      const errorData = JSON.stringify({
        type: 'error',
        content: streamError.message,
        timestamp: new Date().toISOString()
      });
      res.write(`data: ${errorData}\n\n`);
    }

    // End the stream
    res.end();

  } catch (error) {
    console.error("❌ Error processing streaming query:", error);
    
    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: "Streaming query processing failed",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } else {
      // If headers already sent, send error as SSE
      const errorData = JSON.stringify({
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString()
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
});

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
