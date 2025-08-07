const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Import services
const DocumentProcessor = require('../services/DocumentProcessor');
const AstraDBVectorStoreService = require('../services/AstraDBVectorStoreService');

// Import error handling
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not supported. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Initialize services
const documentProcessor = new DocumentProcessor();
const vectorStoreService = new AstraDBVectorStoreService();

/**
 * @route POST /api/ingestion/upload
 * @desc Upload and process a single document to Astra DB
 * @access Public
 */
router.post('/upload', upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('Please upload a document file');
  }

  console.log(`📄 Processing file: ${req.file.originalname}`);

  try {
    // Step 1: Process the document (chunking and formatting)
    const chunks = await documentProcessor.processDocument(req.file.path);
    
    console.log(`✂️  Document split into ${chunks.length} chunks`);

    // Step 2: Generate embeddings and store in Astra DB
    const result = await vectorStoreService.storeChunks(chunks, {
      source: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      vectorStore: 'astra-db'
    });

    // Clean up uploaded file
    await fs.remove(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Document processed and stored successfully in Astra DB',
      data: {
        originalName: req.file.originalname,
        chunksProcessed: chunks.length,
        vectorStoreId: result.id,
        processingTime: result.processingTime,
        collectionName: result.collectionName,
        endpoint: result.endpoint
      },
      requestId: req.id
    });

  } catch (error) {
    // Clean up file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }
    throw error; // Re-throw to be handled by global error handler
  }
}));

/**
 * @route POST /api/ingestion/batch
 * @desc Upload and process multiple documents to Astra DB
 * @access Public
 */
router.post('/batch', upload.array('documents', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ValidationError('Please upload at least one document file');
  }

  console.log(`📚 Processing ${req.files.length} documents`);

  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      console.log(`📄 Processing: ${file.originalname}`);
      
      // Process each document
      const chunks = await documentProcessor.processDocument(file.path);
      const result = await vectorStoreService.storeChunks(chunks, {
        source: file.originalname,
        uploadedAt: new Date().toISOString(),
        vectorStore: 'astra-db'
      });

      results.push({
        originalName: file.originalname,
        chunksProcessed: chunks.length,
        vectorStoreId: result.id,
        processingTime: result.processingTime,
        collectionName: result.collectionName
      });

      // Clean up file
      await fs.remove(file.path);

    } catch (error) {
      console.error(`Error processing ${file.originalname}:`, error);
      errors.push({
        fileName: file.originalname,
        error: error.message
      });
      
      // Clean up file on error
      await fs.remove(file.path).catch(console.error);
    }
  }

  res.status(200).json({
    success: true,
    message: `Batch processing completed. ${results.length} successful, ${errors.length} failed`,
    data: {
      successful: results,
      failed: errors
    },
    requestId: req.id
  });
}));

/**
 * @route GET /api/ingestion/status
 * @desc Get Astra DB ingestion status and statistics
 * @access Public
 */
router.get('/status', asyncHandler(async (req, res) => {
  const stats = await vectorStoreService.getStats();
  
  res.status(200).json({
    success: true,
    data: stats,
    requestId: req.id
  });
}));

/**
 * @route DELETE /api/ingestion/clear
 * @desc Clear all ingested data from Astra DB (for testing/reset purposes)
 * @access Public
 */
router.delete('/clear', asyncHandler(async (req, res) => {
  await vectorStoreService.clearAll();
  
  res.status(200).json({
    success: true,
    message: 'All ingested data cleared successfully from Astra DB',
    requestId: req.id
  });
}));

module.exports = router; 