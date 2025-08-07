#!/usr/bin/env node

const dotenv = require("dotenv");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");

// Load environment variables
dotenv.config();

// Import services
const AstraDBVectorStoreService = require("../services/AstraDBVectorStoreService");

class AstraDBQueryService {
  constructor() {
    this.vectorStoreService = new AstraDBVectorStoreService();
    this.chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 1000,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are the Saleshandy Internal AI Assistant, a specialized knowledge base system designed to help internal teams understand and navigate the Saleshandy cold outreach platform. You have comprehensive knowledge of Saleshandy's product features, capabilities, and internal processes. Use the below context to augment what you know about Saleshandy.

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say "I cannot find the answer in the provided documents."
- Be concise but thorough
- Use bullet points when appropriate for better readability

----------------
START CONTEXT
{context}
END CONTEXT
----------------
Question: {question}
----------------
`);

    this.chain = this.promptTemplate
      .pipe(this.chatModel)
      .pipe(new StringOutputParser());
  }

  /**
   * Query the AI with context from vector store
   * @param {string} question - User's question
   * @param {number} k - Number of similar documents to retrieve
   * @returns {Promise<Object>} AI response with metadata
   */
  async queryAI(question, k = 4) {
    try {
      console.log(`🤖 Processing question: "${question}"`);

      const startTime = Date.now();

      // Step 1: Retrieve relevant documents from vector store
      const relevantDocs = await this.vectorStoreService.similaritySearch(
        question,
        k
      );

      console.log("Relevant docs", relevantDocs);

      if (relevantDocs.length === 0) {
        return {
          answer:
            "I cannot find any relevant information in the knowledge base to answer your question.",
          sources: [],
          processingTime: Date.now() - startTime,
          documentsRetrieved: 0,
        };
      }

      // Step 2: Prepare context from retrieved documents
      const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

      // Step 3: Generate AI response
      // TODO Check here
      const response = await this.chain.invoke({
        context: context,
        question: question,
      });

      const processingTime = Date.now() - startTime;

      // Step 4: Prepare sources metadata
      const sources = relevantDocs.map((doc) => ({
        content: doc.pageContent.substring(0, 200) + "...",
        metadata: doc.metadata,
      }));

      console.log(`✅ Query completed in ${processingTime}ms`);

      return {
        question: question,
        answer: response,
        processingTime,
        documentsRetrieved: relevantDocs.length,
        sources: sources,
      };
    } catch (error) {
      console.error("❌ Query failed:", error);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Test the vector store connection
   */
  async testConnection() {
    try {
      console.log("🔗 Testing Astra DB connection...");

      const isConnected = await this.vectorStoreService.testConnection();

      if (isConnected) {
        console.log("✅ Astra DB connection successful");
      } else {
        console.log("❌ Astra DB connection failed");
      }

      return isConnected;
    } catch (error) {
      console.error("❌ Connection test failed:", error.message);
      return false;
    }
  }

  /**
   * Get vector store statistics
   */
  async getStats() {
    try {
      console.log("📊 Getting Astra DB statistics...");

      const stats = await this.vectorStoreService.getStats();

      console.log("📈 Astra DB Stats:", stats);

      return stats;
    } catch (error) {
      console.error("❌ Failed to get stats:", error.message);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const queryService = new QueryService();

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "ask":
        if (!args[1]) {
          console.error("❌ Please provide a question");
          console.log('Usage: npm run query ask "your question here"');
          process.exit(1);
        }
        const question = args.slice(1).join(" ");
        const result = await queryService.queryAI(question);

        console.log("\n🤖 AI Response:");
        console.log(result.answer);
        console.log(`\n📊 Processing time: ${result.processingTime}ms`);
        console.log(`📚 Documents retrieved: ${result.documentsRetrieved}`);

        if (result.sources.length > 0) {
          console.log("\n📖 Sources:");
          result.sources.forEach((source, index) => {
            console.log(`${index + 1}. ${source.content}`);
          });
        }
        break;

      case "test":
        await queryService.testConnection();
        break;

      case "stats":
        await queryService.getStats();
        break;

      default:
        console.log("🤖 Knowledge Base Query Service");
        console.log("\nUsage:");
        console.log('  npm run query ask "your question"  - Ask a question');
        console.log(
          "  npm run query test                 - Test Astra DB connection"
        );
        console.log(
          "  npm run query stats                - Get Astra DB statistics"
        );
        console.log("\nExamples:");
        console.log('  npm run query ask "What are the key findings?"');
        console.log('  npm run query ask "How does the system work?"');
        break;
    }
  } catch (error) {
    console.error("❌ Query execution failed:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = AstraDBQueryService;
