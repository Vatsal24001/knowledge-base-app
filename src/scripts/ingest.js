#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import services
const DocumentProcessor = require('../services/DocumentProcessor');
const AstraDBVectorStoreService = require('../services/AstraDBVectorStoreService');

class IngestionScript {
  constructor() {
    this.documentProcessor = new DocumentProcessor();
    this.vectorStoreService = new AstraDBVectorStoreService();
  }

  /**
   * Process a single document file
   * @param {string} filePath - Path to the document file
   */
  async processSingleDocument(filePath) {
    try {
      console.log(`\n🚀 Starting Astra DB ingestion for: ${path.basename(filePath)}`);
      
      // Validate the document
      await this.documentProcessor.validateDocument(filePath);
      console.log('✅ Document validation passed');

      // Process the document (chunking and formatting)
      const chunks = await this.documentProcessor.processDocument(filePath);
      
      // Get chunking statistics
      const stats = this.documentProcessor.getChunkingStats(chunks);
      console.log('📊 Chunking Statistics:', stats);

      // Store chunks in Astra DB
      const result = await this.vectorStoreService.storeChunks(chunks, {
        source: path.basename(filePath),
        uploadedAt: new Date().toISOString(),
        script: 'ingest.js',
        vectorStore: 'astra-db'
      });

      console.log('✅ Document ingestion completed successfully!');
      console.log('📈 Results:', result);

      return result;

    } catch (error) {
      console.error('❌ Document ingestion failed:', error.message);
      throw error;
    }
  }

  /**
   * Process all documents in a directory
   * @param {string} directoryPath - Path to the directory containing documents
   */
  async processDirectory(directoryPath) {
    try {
      console.log(`\n📁 Processing directory: ${directoryPath}`);

      // Get all files in the directory
      const files = await fs.readdir(directoryPath);
      const supportedExtensions = ['.pdf', '.docx', '.txt', '.md'];
      
      const documentFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });

      if (documentFiles.length === 0) {
        console.log('⚠️  No supported document files found in directory');
        return;
      }

      console.log(`📚 Found ${documentFiles.length} document files to process`);

      const results = [];
      const errors = [];

      for (const file of documentFiles) {
        try {
          const filePath = path.join(directoryPath, file);
          const result = await this.processSingleDocument(filePath);
          results.push({ file, result });
        } catch (error) {
          console.error(`❌ Failed to process ${file}:`, error.message);
          errors.push({ file, error: error.message });
        }
      }

      // Print summary
      console.log('\n📋 Astra DB Ingestion Summary:');
      console.log(`✅ Successful: ${results.length}`);
      console.log(`❌ Failed: ${errors.length}`);
      
      if (results.length > 0) {
        console.log('\n✅ Successfully processed:');
        results.forEach(({ file, result }) => {
          console.log(`  - ${file} (${result.chunksStored} chunks)`);
        });
      }

      if (errors.length > 0) {
        console.log('\n❌ Failed to process:');
        errors.forEach(({ file, error }) => {
          console.log(`  - ${file}: ${error}`);
        });
      }

      return { results, errors };

    } catch (error) {
      console.error('❌ Directory processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Test the Astra DB connection
   */
  async testConnection() {
    try {
      console.log('🔗 Testing Astra DB connection...');
      
      const isConnected = await this.vectorStoreService.testConnection();
      
      if (isConnected) {
        console.log('✅ Astra DB connection successful');
      } else {
        console.log('❌ Astra DB connection failed');
      }

      return isConnected;

    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get Astra DB statistics
   */
  async getStats() {
    try {
      console.log('📊 Getting Astra DB statistics...');
      
      const stats = await this.vectorStoreService.getStats();
      
      console.log('📈 Astra DB Stats:', stats);

      return stats;

    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const script = new IngestionScript();

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'file':
        if (!args[1]) {
          console.error('❌ Please provide a file path');
          console.log('Usage: npm run ingest file <file-path>');
          process.exit(1);
        }
        await script.processSingleDocument(args[1]);
        break;

      case 'directory':
        if (!args[1]) {
          console.error('❌ Please provide a directory path');
          console.log('Usage: npm run ingest directory <directory-path>');
          process.exit(1);
        }
        await script.processDirectory(args[1]);
        break;

      case 'test':
        await script.testConnection();
        break;

      case 'stats':
        await script.getStats();
        break;

      default:
        console.log('📚 Knowledge Base Ingestion Script (Astra DB)');
        console.log('\nUsage:');
        console.log('  npm run ingest file <file-path>     - Process a single file');
        console.log('  npm run ingest directory <dir-path>  - Process all files in directory');
        console.log('  npm run ingest test                 - Test Astra DB connection');
        console.log('  npm run ingest stats                - Get Astra DB statistics');
        console.log('\nExamples:');
        console.log('  npm run ingest file ./documents/report.pdf');
        console.log('  npm run ingest directory ./documents/');
        break;
    }

  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = IngestionScript; 