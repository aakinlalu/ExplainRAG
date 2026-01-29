# Learn RAG - Interactive RAG Learning Platform

An interactive application to learn and practice Retrieval-Augmented Generation (RAG) concepts with hands-on experience.

## Features

- 📚 **Learn**: Visual overview of the RAG pipeline
- 📤 **Ingest**: Upload documents with configurable chunking strategies
- 💬 **Query**: Ask questions and see the RAG pipeline in action
- 🗄️ **Manage**: View and delete documents from the vector database

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **LangChain** - LLM application framework
- **LanceDB** - Vector database for embeddings
- **OpenAI** - Embeddings and language model

### Frontend
- **React** - UI library
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- uv (Python package manager)
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create .env file with your OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Install dependencies with uv
uv sync

# Run the server


```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at http://localhost:3000 and will proxy API requests to the backend at http://localhost:8000.

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload and process a document
- `GET /api/documents` - List all documents
- `DELETE /api/documents/{document_id}` - Delete a specific document
- `DELETE /api/documents` - Delete all documents

### Query
- `POST /api/query` - Query the RAG system

### Learning
- `GET /api/chunking-strategies` - Get available chunking strategies
- `GET /api/pipeline-overview` - Get RAG pipeline overview

## Chunking Strategies

1. **Fixed Size** - Split text into fixed character chunks
2. **Sentence-Based** - Split at sentence boundaries
3. **Paragraph-Based** - Split at paragraph boundaries
4. **Semantic (Token)** - Token-based splitting optimized for LLMs

## License

MIT
