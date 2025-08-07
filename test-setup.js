#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🧪 Testing Knowledge Base App Setup\n');

async function testSetup() {
  const tests = [
    {
      name: 'Environment Variables',
      test: () => {
        const required = ['OPENAI_API_KEY', 'CHROMA_URL', 'CHROMA_COLLECTION_NAME'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
          throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        
        return '✅ All required environment variables are set';
      }
    },
    {
      name: 'Dependencies',
      test: () => {
        const packageJson = require('./package.json');
        const requiredDeps = [
          'express', 'langchain', '@langchain/openai', '@langchain/community',
          'chromadb', 'pdf-parse', 'mammoth', 'fs-extra'
        ];
        
        const missing = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
        
        if (missing.length > 0) {
          throw new Error(`Missing dependencies: ${missing.join(', ')}`);
        }
        
        return '✅ All required dependencies are installed';
      }
    },
    {
      name: 'File Structure',
      test: () => {
        const requiredFiles = [
          'src/server.js',
          'src/routes/ingestion.js',
          'src/routes/query.js',
          'src/services/DocumentProcessor.js',
          'src/services/VectorStoreService.js',
          'src/scripts/ingest.js',
          'package.json',
          'Dockerfile',
          'docker-compose.app.yml',
          'docker-compose.db.yml'
        ];
        
        const missing = requiredFiles.filter(file => !fs.existsSync(file));
        
        if (missing.length > 0) {
          throw new Error(`Missing files: ${missing.join(', ')}`);
        }
        
        return '✅ All required files exist';
      }
    },
    {
      name: 'Directories',
      test: () => {
        const requiredDirs = ['uploads', 'logs'];
        
        for (const dir of requiredDirs) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }
        
        return '✅ Required directories created';
      }
    },
    {
      name: 'Node Modules',
      test: () => {
        if (!fs.existsSync('node_modules')) {
          throw new Error('node_modules not found. Run "npm install" first');
        }
        
        return '✅ Node modules are installed';
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = test.test();
      console.log(`  ${result}\n`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${error.message}\n`);
      failed++;
    }
  }

  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your setup is ready.');
    console.log('\nNext steps:');
    console.log('1. Start ChromaDB: docker-compose -f docker-compose.db.yml up -d');
    console.log('2. Start the app: npm run dev');
    console.log('3. Test with: curl http://localhost:3000/health');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run tests
testSetup().catch(console.error); 