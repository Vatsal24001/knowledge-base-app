const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Import services
const DocumentProcessor = require('../services/DocumentProcessor');
const VectorStoreService = require('../services/VectorStoreService');

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
const vectorStoreService = new VectorStoreService();

/**
 * @route POST /api/ingestion/upload
 * @desc Upload and process a single document
 * @access Public
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a document file'
      });
    }

    console.log(`📄 Processing file: ${req.file.originalname}`);

    // Step 1: Process the document (chunking and formatting)
    const chunks = await documentProcessor.processDocument(req.file.path);
    
    console.log(`✂️  Document split into ${chunks.length} chunks`);

    // Step 2: Generate embeddings and store in vector database
    const result = await vectorStoreService.storeChunks(chunks, {
      source: req.file.originalname,
      uploadedAt: new Date().toISOString()
    });

    // Clean up uploaded file
    await fs.remove(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Document processed and stored successfully',
      data: {
        originalName: req.file.originalname,
        chunksProcessed: chunks.length,
        vectorStoreId: result.id,
        processingTime: result.processingTime
      }
    });

  } catch (error) {
    console.error('Error processing document:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }

    res.status(500).json({
      error: 'Document processing failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ingestion/batch
 * @desc Upload and process multiple documents
 * @access Public
 */
router.post('/batch', upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one document file'
      });
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
          uploadedAt: new Date().toISOString()
        });

        results.push({
          originalName: file.originalname,
          chunksProcessed: chunks.length,
          vectorStoreId: result.id,
          processingTime: result.processingTime
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
      }
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({
      error: 'Batch processing failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ingestion/status
 * @desc Get ingestion status and statistics
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await vectorStoreService.getStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting ingestion status:', error);
    res.status(500).json({
      error: 'Failed to get ingestion status',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/ingestion/clear
 * @desc Clear all ingested data (for testing/reset purposes)
 * @access Public
 */
router.delete('/clear', async (req, res) => {
  try {
    await vectorStoreService.clearAll();
    
    res.status(200).json({
      success: true,
      message: 'All ingested data cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({
      error: 'Failed to clear data',
      message: error.message
    });
  }
});

module.exports = router; 