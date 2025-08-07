# Knowledge Base App

A RAG (Retrieval-Augmented Generation) based knowledge base application built with Node.js, Express, LangChain, and ChromaDB. This application allows you to ingest documents and query them using AI-powered search.

## 🚀 Features

### Phase 1: Data Ingestion Pipeline ✅
- **Document Processing**: Support for PDF, DOCX, TXT, and MD files
- **Smart Chunking**: Recursive character text splitting with configurable chunk sizes
- **Vector Embeddings**: OpenAI text-embedding-3-small for high-quality embeddings
- **Vector Database**: ChromaDB for efficient similarity search
- **Batch Processing**: Upload and process multiple documents at once
- **RESTful API**: Complete API for document ingestion and management

### Phase 2: Query Pipeline ✅
- **Query Embedding**: Convert user questions to vector embeddings
- **Similarity Search**: Find relevant document chunks
- **RAG Generation**: Generate AI-powered responses using retrieved context
- **Streaming Responses**: Real-time streaming of AI responses via Server-Sent Events
- **Alternative Questions**: Generate multiple question variants for better context retrieval

## 📁 Project Structure

```
knowledge-base-app/
├── src/
│   ├── routes/
│   │   ├── ingestion.js      # Document ingestion endpoints
│   │   └── query.js          # Query endpoints (Phase 2)
│   ├── services/
│   │   ├── DocumentProcessor.js    # Document processing & chunking
│   │   └── VectorStoreService.js  # Vector database operations
│   ├── scripts/
│   │   └── ingest.js         # Standalone ingestion script
│   └── server.js             # Main Express server
├── uploads/                  # Temporary file uploads
├── logs/                     # Application logs
├── docker-compose.app.yml    # Application Docker Compose
├── docker-compose.db.yml     # Database Docker Compose
├── Dockerfile               # Application Dockerfile
├── package.json             # Node.js dependencies
└── README.md               # This file
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- OpenAI API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd knowledge-base-app
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ChromaDB Configuration
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION_NAME=knowledge-base

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# Logging Configuration
LOG_LEVEL=info
```

### 3. Start the Database

Start ChromaDB using Docker Compose:

```bash
docker-compose -f docker-compose.db.yml up -d
```

### 4. Start the Application

#### Option A: Development Mode
```bash
npm run dev
```

#### Option B: Production Mode
```bash
npm start
```

#### Option C: Docker
```bash
docker-compose -f docker-compose.app.yml up -d
```

## 📚 API Documentation

### Health Check
```bash
GET /health
```

### Document Ingestion

#### Upload Single Document
```bash
POST /api/ingestion/upload
Content-Type: multipart/form-data

document: <file>
```

#### Upload Multiple Documents
```bash
POST /api/ingestion/batch
Content-Type: multipart/form-data

documents: <files>
```

#### Get Ingestion Status
```bash
GET /api/ingestion/status
```

#### Clear All Data
```bash
DELETE /api/ingestion/clear
```

### Query Endpoints

#### Standard Query
```bash
POST /api/query/ask
Content-Type: application/json

{
  "question": "What were the key takeaways from the Q3 analysis?"
}
```

#### Streaming Query
```bash
POST /api/query/ask-stream
Content-Type: application/json

{
  "question": "What were the key takeaways from the Q3 analysis?"
}
```

The streaming endpoint returns Server-Sent Events (SSE) with the following event types:
- `connected`: Initial connection established
- `content`: AI response chunks
- `complete`: Query completed with metadata
- `error`: Error occurred during processing

**Example JavaScript usage:**
```javascript
const response = await fetch('/api/query/ask-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'Your question here' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data.type, data.content);
    }
  }
}
```

## 🚀 Usage Examples

### 1. Interactive Demo

Visit the streaming demo in your browser:
```bash
http://localhost:3000/demo
```

This provides a web interface to test the streaming functionality with real-time AI responses.

### 2. Using the API

#### Upload a Document
```bash
curl -X POST http://localhost:3000/api/ingestion/upload \
  -F "document=@/path/to/your/document.pdf"
```

#### Batch Upload
```bash
curl -X POST http://localhost:3000/api/ingestion/batch \
  -F "documents=@/path/to/doc1.pdf" \
  -F "documents=@/path/to/doc2.docx"
```

### 2. Using the Ingestion Script

#### Process Single File
```bash
npm run ingest file ./documents/report.pdf
```

#### Process Directory
```bash
npm run ingest directory ./documents/
```

#### Test Connection
```bash
npm run ingest test
```

#### Get Statistics
```bash
npm run ingest stats
```

## 🐳 Docker Deployment

### Separate Deployment (Recommended)

#### 1. Deploy Database
```bash
# Start ChromaDB
docker-compose -f docker-compose.db.yml up -d

# Check database status
docker-compose -f docker-compose.db.yml logs chromadb
```

#### 2. Deploy Application
```bash
# Set environment variables
export OPENAI_API_KEY=your_api_key_here

# Start application
docker-compose -f docker-compose.app.yml up -d

# Check application status
docker-compose -f docker-compose.app.yml logs knowledge-base-app
```

### Combined Deployment
```bash
# Create combined docker-compose.yml
cat docker-compose.db.yml docker-compose.app.yml > docker-compose.yml

# Start all services
docker-compose up -d
```

## 🔧 Configuration

### Chunking Configuration
Edit `src/services/DocumentProcessor.js` to adjust chunking parameters:

```javascript
this.textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // Characters per chunk
  chunkOverlap: 200,      // Overlap between chunks
  separators: ['\n\n', '\n', ' ', '']  // Split on these characters
});
```

### Vector Database Configuration
Edit `src/services/VectorStoreService.js` to adjust embedding settings:

```javascript
this.embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',  // Embedding model
  maxConcurrency: 5                      // Concurrent requests
});
```

## 📊 Monitoring

### Health Checks
- Application: `http://localhost:3000/health`
- ChromaDB: `http://localhost:8000/api/v1/heartbeat`

### Logs
```bash
# Application logs
docker-compose -f docker-compose.app.yml logs -f knowledge-base-app

# Database logs
docker-compose -f docker-compose.db.yml logs -f chromadb
```

## 🧪 Testing

### Test Document Processing
```bash
# Create a test document
echo "This is a test document for the knowledge base." > test.txt

# Process it
npm run ingest file test.txt
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Upload test document
curl -X POST http://localhost:3000/api/ingestion/upload \
  -F "document=@test.txt"
```

## 🔒 Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **File Uploads**: Implement proper file validation and sanitization
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Authentication**: Add authentication for production deployments
5. **CORS**: Configure CORS properly for your frontend

## 🚀 Production Deployment

### Environment Variables
```bash
NODE_ENV=production
OPENAI_API_KEY=your_production_api_key
CHROMA_URL=http://your-chromadb-instance:8000
```

### Scaling Considerations
- Use a managed ChromaDB service for production
- Implement proper logging and monitoring
- Set up automated backups for the vector database
- Consider using a load balancer for the API

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the logs for error messages
2. Verify your environment configuration
3. Test the database connection
4. Check OpenAI API key and quota

---

**Note**: Both Phase 1 (Data Ingestion Pipeline) and Phase 2 (Query Pipeline) are now fully implemented with streaming capabilities. 