#!/usr/bin/env node

const { ChromaClient } = require('chromadb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class ChromaDBTester {
  constructor() {
    this.client = null;
    this.collectionName = process.env.CHROMA_COLLECTION_NAME || 'knowledge-base';
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  }

  /**
   * Initialize the ChromaDB client
   */
  async initialize() {
    try {
      console.log(`🔗 Connecting to ChromaDB at ${this.chromaUrl}`);
      
      this.client = new ChromaClient({
        path: this.chromaUrl
      });

      // Test the connection
      await this.client.heartbeat();
      console.log('✅ ChromaDB connection successful');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to ChromaDB:', error.message);
      return false;
    }
  }

  /**
   * List all collections
   */
  async listCollections() {
    try {
      console.log('\n📚 Listing all collections...');
      const collections = await this.client.listCollections();
      
      console.log('Collections found:');
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name} (${collection.metadata?.description || 'No description'})`);
      });
      
      return collections;
    } catch (error) {
      console.error('❌ Error listing collections:', error.message);
      return [];
    }
  }

  /**
   * Get collection details
   */
  async getCollectionDetails(collectionName = null) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n📋 Getting details for collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      console.log('Collection details:');
      console.log(`  Name: ${collection.name}`);
      console.log(`  Metadata: ${JSON.stringify(collection.metadata, null, 2)}`);
      
      return collection;
    } catch (error) {
      console.error(`❌ Error getting collection details:`, error.message);
      return null;
    }
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(collectionName = null) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n📊 Counting documents in collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      const count = await collection.count();
      console.log(`  Total documents: ${count}`);
      
      return count;
    } catch (error) {
      console.error(`❌ Error counting documents:`, error.message);
      return 0;
    }
  }

  /**
   * Get sample documents from a collection
   */
  async getSampleDocuments(collectionName = null, limit = 5) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n📄 Getting ${limit} sample documents from collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      const results = await collection.get({
        limit: limit
      });
      
      console.log('Sample documents:');
      if (results.ids && results.ids.length > 0) {
        for (let i = 0; i < results.ids.length; i++) {
          console.log(`\n  Document ${i + 1}:`);
          console.log(`    ID: ${results.ids[i]}`);
          console.log(`    Content: ${results.documents[i]?.substring(0, 100)}...`);
          console.log(`    Metadata: ${JSON.stringify(results.metadatas[i], null, 2)}`);
        }
      } else {
        console.log('  No documents found');
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error getting sample documents:`, error.message);
      return null;
    }
  }

  /**
   * Search for documents
   */
  async searchDocuments(query, collectionName = null, limit = 5) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n🔍 Searching for "${query}" in collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      const results = await collection.query({
        queryTexts: [query],
        nResults: limit
      });
      
      console.log(`Found ${results.ids[0]?.length || 0} results:`);
      if (results.ids[0] && results.ids[0].length > 0) {
        for (let i = 0; i < results.ids[0].length; i++) {
          console.log(`\n  Result ${i + 1}:`);
          console.log(`    ID: ${results.ids[0][i]}`);
          console.log(`    Distance: ${results.distances[0][i]}`);
          console.log(`    Content: ${results.documents[0][i]?.substring(0, 100)}...`);
          console.log(`    Metadata: ${JSON.stringify(results.metadatas[0][i], null, 2)}`);
        }
      } else {
        console.log('  No results found');
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error searching documents:`, error.message);
      return null;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName = null) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n📈 Getting statistics for collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      const count = await collection.count();
      
      const stats = {
        name: name,
        documentCount: count,
        lastUpdated: new Date().toISOString(),
        chromaUrl: this.chromaUrl
      };
      
      console.log('Collection statistics:');
      console.log(`  Name: ${stats.name}`);
      console.log(`  Document count: ${stats.documentCount}`);
      console.log(`  Last updated: ${stats.lastUpdated}`);
      console.log(`  ChromaDB URL: ${stats.chromaUrl}`);
      
      return stats;
    } catch (error) {
      console.error(`❌ Error getting collection stats:`, error.message);
      return null;
    }
  }

  /**
   * Test adding a sample document
   */
  async testAddDocument(collectionName = null) {
    try {
      const name = collectionName || this.collectionName;
      console.log(`\n➕ Testing document addition to collection: ${name}`);
      
      const collection = await this.client.getCollection({
        name: name
      });
      
      const testId = `test-${Date.now()}`;
      const testDocument = "This is a test document for ChromaDB testing.";
      const testMetadata = {
        source: "test",
        type: "test-document",
        createdAt: new Date().toISOString()
      };
      
      await collection.add({
        ids: [testId],
        documents: [testDocument],
        metadatas: [testMetadata]
      });
      
      console.log('✅ Test document added successfully');
      console.log(`  ID: ${testId}`);
      console.log(`  Content: ${testDocument}`);
      console.log(`  Metadata: ${JSON.stringify(testMetadata, null, 2)}`);
      
      return testId;
    } catch (error) {
      console.error(`❌ Error adding test document:`, error.message);
      return null;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting ChromaDB Tests\n');
    
    // Initialize connection
    const connected = await this.initialize();
    if (!connected) {
      console.log('❌ Cannot proceed without ChromaDB connection');
      return;
    }
    
    // Run all test methods
    const tests = [
      { name: 'List Collections', method: () => this.listCollections() },
      { name: 'Get Collection Details', method: () => this.getCollectionDetails() },
      { name: 'Count Documents', method: () => this.countDocuments() },
      { name: 'Get Sample Documents', method: () => this.getSampleDocuments() },
      { name: 'Search Documents', method: () => this.searchDocuments('test') },
      { name: 'Get Collection Stats', method: () => this.getCollectionStats() },
      { name: 'Test Add Document', method: () => this.testAddDocument() }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Running: ${test.name}`);
        console.log(`${'='.repeat(50)}`);
        
        await test.method();
        passed++;
        
      } catch (error) {
        console.error(`❌ Test "${test.name}" failed:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Test Results Summary');
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! ChromaDB is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new ChromaDBTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ChromaDBTester; 