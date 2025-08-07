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
        const required = [
          'OPENAI_API_KEY', 
          'ASTRA_DB_API_ENDPOINT', 
          'ASTRA_DB_APPLICATION_TOKEN', 
          'ASTRA_COLLECTION_NAME'
        ];
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
          'express', 
          'langchain', 
          '@langchain/openai', 
          '@langchain/community',
          '@datastax/astra-db-ts',
          'pdf-parse', 
          'mammoth', 
          'fs-extra'
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
          'src/services/AstraDBVectorStoreService.js',
          'src/scripts/ingest.js',
          'package.json',
          'Dockerfile',
          'docker-compose.app.yml'
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
    },
    {
      name: 'Astra DB Configuration',
      test: () => {
        const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
        const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
        const collection = process.env.ASTRA_COLLECTION_NAME;
        
        if (!endpoint || !endpoint.includes('astra.datastax.com')) {
          throw new Error('Invalid Astra DB endpoint format');
        }
        
        if (!token || !token.startsWith('AstraCS:')) {
          throw new Error('Invalid Astra DB token format');
        }
        
        if (!collection || collection.length < 1) {
          throw new Error('Astra DB collection name is required');
        }
        
        return `✅ Astra DB configured (Collection: ${collection})`;
      }
    },
    {
      name: 'Astra DB Connection Test',
      test: async () => {
        try {
          const { createClient } = require('@datastax/astra-db-ts');
          
          const client = createClient({
            token: process.env.ASTRA_DB_APPLICATION_TOKEN,
            endpoint: process.env.ASTRA_DB_API_ENDPOINT,
          });
          
          const db = client.db();
          
          // Test connection by listing collections
          await db.listCollections();
          
          await client.close();
          
          return '✅ Astra DB connection successful';
        } catch (error) {
          throw new Error(`Astra DB connection failed: ${error.message}`);
        }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await test.test();
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
    console.log('1. Start the app: npm run dev');
    console.log('2. Test with: curl http://localhost:3000/health');
    console.log('3. Test Astra DB: curl http://localhost:3000/api/ingestion/status');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
    console.log('\nTroubleshooting tips:');
    console.log('- Check your .env file has all required Astra DB variables');
    console.log('- Verify your Astra DB token and endpoint are correct');
    console.log('- Ensure @datastax/astra-db-ts is installed: npm install @datastax/astra-db-ts');
    process.exit(1);
  }
}

// Run tests
testSetup().catch(console.error); 