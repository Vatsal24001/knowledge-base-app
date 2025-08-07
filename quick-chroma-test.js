#!/usr/bin/env node

const { ChromaClient } = require('chromadb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function quickTest() {
  console.log('🔍 Quick ChromaDB Data Check\n');
  
  try {
    // Connect to ChromaDB
    const client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
    
    console.log('✅ Connected to ChromaDB');
    
    // List all collections
    console.log('\n📚 Collections:');
    const collections = await client.listCollections();
    collections.forEach((collection, index) => {
      console.log(`  ${index + 1}. ${collection.name}`);
    });
    
    if (collections.length === 0) {
      console.log('  No collections found');
      return;
    }
    
    // Get the first collection or the one specified in env
    const collectionName = process.env.CHROMA_COLLECTION_NAME || collections[0].name;
    console.log(`\n📋 Checking collection: ${collectionName}`);
    
    const collection = await client.getCollection({
      name: collectionName
    });
    
    // Count documents
    const count = await collection.count();
    console.log(`📊 Total documents: ${count}`);
    
    if (count > 0) {
      // Get sample documents
      console.log('\n📄 Sample documents:');
      const results = await collection.get({
        limit: Math.min(3, count)
      });
      
      results.ids.forEach((id, index) => {
        console.log(`\n  Document ${index + 1}:`);
        console.log(`    ID: ${id}`);
        console.log(`    Content: ${results.documents[index]?.substring(0, 150)}...`);
        if (results.metadatas[index]) {
          console.log(`    Metadata: ${JSON.stringify(results.metadatas[index])}`);
        }
      });
      
      // Test a simple search
      console.log('\n🔍 Testing search with "test":');
      const searchResults = await collection.query({
        queryTexts: ["test"],
        nResults: 2
      });
      
      if (searchResults.ids[0] && searchResults.ids[0].length > 0) {
        console.log(`  Found ${searchResults.ids[0].length} results`);
        searchResults.ids[0].forEach((id, index) => {
          console.log(`    Result ${index + 1}: ${id} (distance: ${searchResults.distances[0][index]})`);
        });
      } else {
        console.log('  No search results found');
      }
    }
    
    console.log('\n✅ Quick test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during quick test:', error.message);
    console.log('\n💡 Make sure:');
    console.log('  1. ChromaDB container is running');
    console.log('  2. Environment variables are set correctly');
    console.log('  3. Network connectivity is working');
  }
}

// Run the quick test
quickTest(); 