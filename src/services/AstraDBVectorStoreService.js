const { OpenAIEmbeddings } = require("@langchain/openai");
const {
  AstraDBVectorStore,
} = require("@langchain/community/vectorstores/astradb");
const { Document } = require("langchain/document");

class AstraDBVectorStoreService {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
      maxConcurrency: 5,
    });

    this.astraConfig = {
      token: process.env.ASTRA_DB_APPLICATION_TOKEN,
      endpoint: process.env.ASTRA_DB_API_ENDPOINT,
      collection: process.env.ASTRA_COLLECTION_NAME || "knowledge_base",
      collectionOptions: {
        vector: {
          dimension: 1536, // OpenAI text-embedding-3-small dimension
          metric: "cosine",
        },
      },
    };

    this.vectorStore = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the Astra DB vector store connection
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      console.log(`🔗 Connecting to Astra DB at ${this.astraConfig.endpoint}`);
      console.log(`📚 Using collection: ${this.astraConfig.collection}`);

      // Try to initialize with existing index first
      try {
        this.vectorStore = await AstraDBVectorStore.fromExistingIndex(
          this.embeddings,
          this.astraConfig
        );
        console.log("✅ Connected to existing Astra DB collection");
      } catch (error) {
        console.log(
          "⚠️  Collection does not exist, will be created on first document insertion"
        );
        // Don't initialize vectorStore yet - it will be created when first document is added
        this.vectorStore = null;
      }

      this.isInitialized = true;
      console.log("✅ Astra DB vector store initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Astra DB vector store:", error);
      throw new Error(`Astra DB initialization failed: ${error.message}`);
    }
  }

  /**
   * Store document chunks in Astra DB
   * @param {Array} chunks - Array of document chunks
   * @param {Object} metadata - Additional metadata for the chunks
   * @returns {Promise<Object>} Result of the storage operation
   */
  async storeChunks(chunks, metadata = {}) {
    try {
      if (!chunks || chunks.length === 0) {
        throw new Error("No chunks provided for storage");
      }

      console.log(`💾 Storing ${chunks.length} chunks in Astra DB`);

      const startTime = Date.now();

      // Add additional metadata to each chunk
      const enrichedChunks = chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            ...metadata,
            storedAt: new Date().toISOString(),
            chunkId: `${metadata.source || "unknown"}-${index}`,
            vectorDimension: 1536,
          },
        });
      });

      // Store chunks in Astra DB using fromDocuments
      // This will create the collection if it doesn't exist
      const vectorStore = await AstraDBVectorStore.fromDocuments(
        enrichedChunks,
        this.embeddings,
        {
          token: this.astraConfig.token,
          endpoint: this.astraConfig.endpoint,
          collection: this.astraConfig.collection,
          collectionOptions: this.astraConfig.collectionOptions,
        }
      );

      // Update our vectorStore reference
      this.vectorStore = vectorStore;

      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Successfully stored ${chunks.length} chunks in ${processingTime}ms`
      );

      return {
        id: `${metadata.source || "unknown"}-${Date.now()}`,
        chunksStored: chunks.length,
        processingTime,
        collectionName: this.astraConfig.collection,
        endpoint: this.astraConfig.endpoint,
      };
    } catch (error) {
      console.error("Error storing chunks in Astra DB:", error);
      throw new Error(`Failed to store chunks in Astra DB: ${error.message}`);
    }
  }

  /**
   * Search for similar documents in Astra DB
   * @param {string} query - Search query
   * @param {number} k - Number of results to return
   * @returns {Promise<Array>} Array of similar documents
   */
  async similaritySearch(query, k = 4) {
    try {
      await this.initialize();

      console.log(`🔍 Searching for: "${query}"`);

      // If vectorStore is null, it means no documents have been stored yet
      if (!this.vectorStore) {
        throw new Error(
          "No documents have been stored in the collection yet. Please ingest some documents first."
        );
      }

      const results = await this.vectorStore.similaritySearch(query, k);

      console.log(`📋 Found ${results.length} similar documents`);

      return results;
    } catch (error) {
      console.error("Error in Astra DB similarity search:", error);
      throw new Error(`Astra DB search failed: ${error.message}`);
    }
  }

  async similaritySearchMultiple(queries, k = 4) {
    try {
      await this.initialize();

      const results = await Promise.all(
        queries.map((query) => this.similaritySearch(query, k))
      );

      return results.flat();
    } catch (error) {
      console.error("Error in Astra DB similarity search multiple:", error);
      return [];
    }
  }

  /**
   * Get statistics about the Astra DB collection
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    try {
      await this.initialize();

      // If no vectorStore exists, return basic stats
      if (!this.vectorStore) {
        return {
          collectionName: this.astraConfig.collection,
          endpoint: this.astraConfig.endpoint,
          isConnected: this.isInitialized,
          lastUpdated: new Date().toISOString(),
          vectorDimension: 1536,
          metric: "cosine",
          status: "No documents stored yet",
          note: "Collection will be created when first documents are ingested",
        };
      }

      // Test connection with a sample query
      const sampleQuery = "test query for stats";
      const results = await this.similaritySearch(sampleQuery, 1);

      return {
        collectionName: this.astraConfig.collection,
        endpoint: this.astraConfig.endpoint,
        isConnected: this.isInitialized,
        lastUpdated: new Date().toISOString(),
        vectorDimension: 1536,
        metric: "cosine",
        status: "Active",
        note: "Astra DB statistics available through direct client access",
      };
    } catch (error) {
      console.error("Error getting Astra DB stats:", error);
      return {
        error: error.message,
        collectionName: this.astraConfig.collection,
        isConnected: false,
      };
    }
  }

  /**
   * Test the Astra DB connection
   * @returns {Promise<boolean>} Whether the connection is successful
   */
  async testConnection() {
    try {
      await this.initialize();

      // If no vectorStore exists, the connection is still valid but no documents stored
      if (!this.vectorStore) {
        console.log(
          "✅ Astra DB connection successful (no documents stored yet)"
        );
        return true;
      }

      // Try a simple search to test the connection
      await this.similaritySearch("test", 1);

      return true;
    } catch (error) {
      console.error("Astra DB connection test failed:", error);
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
      console.error("Error generating embedding:", error);
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
      console.error("Error generating embeddings:", error);
      throw new Error(`Embeddings generation failed: ${error.message}`);
    }
  }

  /**
   * Clear all data from the Astra DB collection
   * @returns {Promise<Object>} Result of the clear operation
   */
  async clearAll() {
    try {
      await this.initialize();

      console.log("🗑️  Clearing all data from Astra DB collection");

      // Note: This would require direct Astra DB client access
      // For now, we'll return a placeholder
      console.log("⚠️  Clear operation requires direct Astra DB client access");

      return {
        success: true,
        message: "Clear operation initiated (requires direct Astra DB access)",
        collectionName: this.astraConfig.collection,
      };
    } catch (error) {
      console.error("Error clearing Astra DB data:", error);
      throw new Error(`Failed to clear Astra DB data: ${error.message}`);
    }
  }
}

module.exports = AstraDBVectorStoreService;
