const fs = require('fs-extra');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Document } = require('@langchain/core/documents');

class DocumentProcessor {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    });
  }

  /**
   * Process a document file: load, convert to text, and chunk
   * @param {string} filePath - Path to the document file
   * @returns {Promise<Array>} Array of document chunks
   */
  async processDocument(filePath) {
    try {
      console.log(`📖 Loading document: ${path.basename(filePath)}`);
      
      // Load and extract text from the document
      const text = await this.extractTextFromFile(filePath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('Document contains no readable text');
      }

      console.log(`📝 Extracted ${text.length} characters of text`);

      // Create a document object
      const document = new Document({
        pageContent: text,
        metadata: {
          source: path.basename(filePath),
          fileType: path.extname(filePath).toLowerCase(),
          processedAt: new Date().toISOString()
        }
      });

      // Split the document into chunks
      const chunks = await this.textSplitter.splitDocuments([document]);
      
      console.log(`✂️  Split document into ${chunks.length} chunks`);

      // Add chunk-specific metadata
      const processedChunks = chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkSize: chunk.pageContent.length
          }
        });
      });

      return processedChunks;

    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Extract text from different file types
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromFile(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    try {
      switch (fileExtension) {
        case '.txt':
        case '.md':
          return await this.extractTextFromTextFile(filePath);
        
        case '.pdf':
          return await this.extractTextFromPDF(filePath);
        
        case '.docx':
          return await this.extractTextFromDOCX(filePath);
        
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract text from ${fileExtension} file: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files
   * @param {string} filePath - Path to the text file
   * @returns {Promise<string>} Text content
   */
  async extractTextFromTextFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF files
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromPDF(filePath) {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX files
   * @param {string} filePath - Path to the DOCX file
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromDOCX(filePath) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  /**
   * Get chunking statistics for a document
   * @param {Array} chunks - Array of document chunks
   * @returns {Object} Statistics about the chunking process
   */
  getChunkingStats(chunks) {
    if (!chunks || chunks.length === 0) {
      return {
        totalChunks: 0,
        averageChunkSize: 0,
        totalCharacters: 0,
        minChunkSize: 0,
        maxChunkSize: 0
      };
    }

    const chunkSizes = chunks.map(chunk => chunk.pageContent.length);
    const totalCharacters = chunkSizes.reduce((sum, size) => sum + size, 0);
    const averageChunkSize = totalCharacters / chunks.length;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);

    return {
      totalChunks: chunks.length,
      averageChunkSize: Math.round(averageChunkSize),
      totalCharacters,
      minChunkSize,
      maxChunkSize
    };
  }

  /**
   * Validate document before processing
   * @param {string} filePath - Path to the document file
   * @returns {Promise<boolean>} Whether the document is valid
   */
  async validateDocument(filePath) {
    try {
      // Check if file exists
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        throw new Error('File does not exist');
      }

      // Check file size (max 10MB)
      const stats = await fs.stat(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Check file extension
      const fileExtension = path.extname(filePath).toLowerCase();
      const supportedExtensions = ['.pdf', '.docx', '.txt', '.md'];
      if (!supportedExtensions.includes(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Document validation failed: ${error.message}`);
    }
  }
}

module.exports = DocumentProcessor; 