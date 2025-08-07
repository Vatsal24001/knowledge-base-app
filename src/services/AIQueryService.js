const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const AstraDBVectorStoreService = require('./AstraDBVectorStoreService');

class AIQueryService {
  constructor() {
    this.vectorStoreService = new AstraDBVectorStoreService();
    this.chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o",
      temperature: 0.1,
      maxTokens: 1000
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant with access to a knowledge base. Use the following context to answer the user's question accurately and concisely.

Context: {context}

Question: {question}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say "I cannot find the answer in the provided documents."
- Be concise but thorough
- Use bullet points when appropriate for better readability

Answer:`);

    this.chain = this.promptTemplate
      .pipe(this.chatModel)
      .pipe(new StringOutputParser());
  }

  /**
   * Query the AI with context from Astra DB
   * @param {string} question - User's question
   * @param {number} k - Number of similar documents to retrieve
   * @returns {Promise<Object>} AI response with metadata
   */
  async queryAI(question, k = 4) {
    try {
      const startTime = Date.now();

      // Step 1: Retrieve relevant documents from Astra DB
      const relevantDocs = await this.vectorStoreService.similaritySearch(question, k);
      
      if (relevantDocs.length === 0) {
        return {
          answer: "I cannot find any relevant information in the knowledge base to answer your question.",
          sources: [],
          processingTime: Date.now() - startTime,
          documentsRetrieved: 0,
          success: false
        };
      }

      // Step 2: Prepare context from retrieved documents
      const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
      
      // Step 3: Generate AI response
      const response = await this.chain.invoke({
        context: context,
        question: question
      });

      const processingTime = Date.now() - startTime;

      // Step 4: Prepare sources metadata
      const sources = relevantDocs.map(doc => ({
        content: doc.pageContent.substring(0, 200) + "...",
        metadata: doc.metadata
      }));

      return {
        answer: response,
        sources: sources,
        processingTime,
        documentsRetrieved: relevantDocs.length,
        question: question,
        success: true
      };

    } catch (error) {
      console.error('AI Query failed:', error);
      return {
        answer: "Sorry, I encountered an error while processing your question.",
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Test the Astra DB connection
   */
  async testConnection() {
    try {
      return await this.vectorStoreService.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Astra DB statistics
   */
  async getStats() {
    try {
      return await this.vectorStoreService.getStats();
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }
}

module.exports = AIQueryService;