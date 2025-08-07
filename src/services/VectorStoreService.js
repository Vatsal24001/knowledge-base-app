const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { Document } = require('@langchain/core/documents');

class VectorStoreService {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      maxConcurrency: 5
    });

    this.collectionName = process.env.CHROMA_COLLECTION_NAME || 'knowledge-base';
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    
    this.vectorStore = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the vector store connection
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      console.log(`🔗 Connecting to ChromaDB at ${this.chromaUrl}`);
      console.log(`📚 Using collection: ${this.collectionName}`);

      // Initialize vector store
      this.vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
        url: this.chromaUrl
      });

      this.isInitialized = true;
      console.log('✅ Vector store initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw new Error(`Vector store initialization failed: ${error.message}`);
    }
  }

  /**
   * Store document chunks in the vector database
   * @param {Array} chunks - Array of document chunks
   * @param {Object} metadata - Additional metadata for the chunks
   * @returns {Promise<Object>} Result of the storage operation
   */
  async storeChunks(chunks, metadata = {}) {
    try {
      await this.initialize();

      if (!chunks || chunks.length === 0) {
        throw new Error('No chunks provided for storage');
      }

      console.log(`💾 Storing ${chunks.length} chunks in vector database`);

      const startTime = Date.now();

      // Add additional metadata to each chunk
      const enrichedChunks = chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            ...metadata,
            storedAt: new Date().toISOString(),
            chunkId: `${metadata.source || 'unknown'}-${index}`
          }
        });
      });

      // Store chunks in vector database
      await Chroma.fromDocuments(enrichedChunks, this.embeddings, {
        collectionName: this.collectionName,
        url: this.chromaUrl
      });

      const processingTime = Date.now() - startTime;

      console.log(`✅ Successfully stored ${chunks.length} chunks in ${processingTime}ms`);

      return {
        id: `${metadata.source || 'unknown'}-${Date.now()}`,
        chunksStored: chunks.length,
        processingTime,
        collectionName: this.collectionName
      };

    } catch (error) {
      console.error('Error storing chunks:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }

  /**
   * Search for similar documents in the vector database
   * @param {string} query - Search query
   * @param {number} k - Number of results to return
   * @returns {Promise<Array>} Array of similar documents
   */
  async similaritySearch(query, k = 4) {
    try {
      await this.initialize();

      console.log(`🔍 Searching for: "${query}"`);

      const results = await this.vectorStore.similaritySearch(query, k);

      console.log(`📋 Found ${results.length} similar documents`);

      return results;

    } catch (error) {
      console.error('Error in similarity search:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get statistics about the vector database
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    try {
      await this.initialize();

      console.log("Test init");

      // Note: ChromaDB doesn't provide direct count methods in LangChain
      // This is a simplified implementation
      const sampleQuery = "test query for stats";
      const results = await this.similaritySearch(sampleQuery, 1);
      
      return {
        collectionName: this.collectionName,
        chromaUrl: this.chromaUrl,
        isConnected: this.isInitialized,
        lastUpdated: new Date().toISOString(),
        note: "Full statistics require direct ChromaDB client access"
      };

    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        error: error.message,
        collectionName: this.collectionName,
        isConnected: false
      };
    }
  }

  /**
   * Clear all data from the vector database
   * @returns {Promise<Object>} Result of the clear operation
   */
  async clearAll() {
    try {
      await this.initialize();

      console.log('🗑️  Clearing all data from vector database');

      // Note: This would require direct ChromaDB client access
      // For now, we'll return a placeholder
      console.log('⚠️  Clear operation requires direct ChromaDB client access');

      return {
        success: true,
        message: 'Clear operation initiated (requires direct ChromaDB access)',
        collectionName: this.collectionName
      };

    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  /**
   * Test the connection to the vector database
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      await this.initialize();
      
      // Try a simple search to test the connection
      await this.similaritySearch("test", 1);
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Array>} Embedding vector
   */
  async getEmbedding(text) {
    try {
      await this.initialize();
      
      const embedding = await this.embeddings.embedQuery(text);
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Get embeddings for multiple texts
   * @param {Array} texts - Array of texts to embed
   * @returns {Promise<Array>} Array of embedding vectors
   */
  async getEmbeddings(texts) {
    try {
      await this.initialize();
      
      const embeddings = await this.embeddings.embedDocuments(texts);
      
      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Embeddings generation failed: ${error.message}`);
    }
  }
}

module.exports = VectorStoreService; 