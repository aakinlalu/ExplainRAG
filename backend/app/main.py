"""
FastAPI application for the RAG Learning Platform.
"""
import os
import uuid
import time
import shutil
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.models import (
    ChunkingStrategy,
    DocumentUploadResponse,
    QueryRequest,
    QueryResponse,
    DeleteRequest,
    DeleteResponse,
    DatabaseStats,
    PipelineStep
)
from app.services import (
    document_processor,
    embedding_service,
    vector_db_service,
    rag_pipeline
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings = get_settings()
    os.makedirs(settings.lancedb_path, exist_ok=True)
    os.makedirs("./data/uploads", exist_ok=True)
    print(f"🚀 RAG Learning Platform started")
    print(f"📁 Vector DB path: {settings.lancedb_path}")
    
    yield
    
    # Shutdown
    print("👋 RAG Learning Platform shutting down")


app = FastAPI(
    title="RAG Learning Platform",
    description="An interactive platform to learn Retrieval-Augmented Generation",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to the RAG Learning Platform!",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": time.time()}


# ============== Document Management Endpoints ==============

@app.post("/api/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    strategy: str = Form(default="fixed"),
    chunk_size: int = Form(default=500),
    chunk_overlap: int = Form(default=50)
):
    """
    Upload a document for processing and indexing.
    
    This endpoint handles:
    1. File upload and storage
    2. Document parsing
    3. Text chunking
    4. Embedding generation
    5. Vector storage
    
    Returns detailed information about each step for learning purposes.
    """
    processing_steps = []
    
    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".doc", ".txt"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )
    
    # Generate document ID
    document_id = str(uuid.uuid4())
    
    # Step 1: Save uploaded file
    start_time = time.time()
    upload_path = f"./data/uploads/{document_id}{file_ext}"
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    processing_steps.append({
        "step": 1,
        "name": "File Upload",
        "description": "Saving the uploaded file to temporary storage",
        "status": "completed",
        "duration_ms": int((time.time() - start_time) * 1000),
        "details": {
            "filename": file.filename,
            "file_size": os.path.getsize(upload_path),
            "document_id": document_id
        }
    })
    
    try:
        # Step 2: Parse document
        start_time = time.time()
        text, metadata = document_processor.parse_file(upload_path, file.filename)
        
        if not text or not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Document appears to be empty or contains no extractable text."
            )
        
        processing_steps.append({
            "step": 2,
            "name": "Document Parsing",
            "description": f"Extracting text from {file_ext} file",
            "status": "completed",
            "duration_ms": int((time.time() - start_time) * 1000),
            "details": {
                "total_characters": metadata["total_characters"],
                "total_tokens": metadata["total_tokens"],
                "text_preview": text[:300] + "..." if len(text) > 300 else text
            }
        })
        
        # Step 3: Chunk the document
        start_time = time.time()
        chunking_strategy = ChunkingStrategy(
            strategy=strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        chunks = document_processor.chunk_text(
            text=text,
            strategy=chunking_strategy,
            document_id=document_id,
            base_metadata=metadata
        )
        
        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="Document produced no chunks. The file may be empty or contain no readable text."
            )
        
        processing_steps.append({
            "step": 3,
            "name": "Text Chunking",
            "description": f"Splitting text using '{strategy}' strategy",
            "status": "completed",
            "duration_ms": int((time.time() - start_time) * 1000),
            "details": {
                "strategy": strategy,
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "total_chunks": len(chunks),
                "avg_chunk_tokens": sum(c.token_count for c in chunks) // len(chunks) if chunks else 0
            }
        })
        
        # Step 4: Generate embeddings
        start_time = time.time()
        chunk_texts = [chunk.content for chunk in chunks]
        embeddings = embedding_service.embed_texts(chunk_texts)
        
        if not embeddings:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate embeddings for the document chunks."
            )
        
        processing_steps.append({
            "step": 4,
            "name": "Embedding Generation",
            "description": "Converting text chunks to vector representations",
            "status": "completed",
            "duration_ms": int((time.time() - start_time) * 1000),
            "details": {
                "embedding_model": get_settings().embedding_model,
                "embedding_dimension": len(embeddings[0]) if embeddings else 0,
                "total_embeddings": len(embeddings),
                "sample_embedding": embeddings[0][:5] if embeddings else []
            }
        })
        
        # Step 5: Store in vector database
        start_time = time.time()
        stored_count = vector_db_service.add_chunks(
            chunks=chunks,
            embeddings=embeddings,
            document_id=document_id,
            filename=file.filename
        )
        
        processing_steps.append({
            "step": 5,
            "name": "Vector Storage",
            "description": "Storing embeddings in LanceDB vector database",
            "status": "completed",
            "duration_ms": int((time.time() - start_time) * 1000),
            "details": {
                "database": "LanceDB",
                "chunks_stored": stored_count,
                "collection_name": get_settings().collection_name
            }
        })
        
        # Get chunk previews
        chunk_previews = document_processor.get_chunk_previews(chunks)
        
        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            total_chunks=len(chunks),
            chunk_previews=chunk_previews,
            processing_steps=processing_steps
        )
        
    except Exception as e:
        # Clean up uploaded file only on error
        if os.path.exists(upload_path):
            os.remove(upload_path)
        raise e


@app.get("/api/documents", response_model=DatabaseStats)
async def list_documents():
    """Get list of all documents in the vector database."""
    stats = vector_db_service.get_stats()
    return DatabaseStats(**stats)


@app.delete("/api/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(document_id: str):
    """Delete a specific document from the vector database and remove uploaded file."""
    # Delete from vector database
    deleted_count = vector_db_service.delete_document(document_id)
    
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete the uploaded file from disk
    upload_dir = "./data/uploads"
    files_deleted = []
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            if filename.startswith(document_id):
                file_path = os.path.join(upload_dir, filename)
                try:
                    os.remove(file_path)
                    files_deleted.append(filename)
                except OSError as e:
                    print(f"Warning: Could not delete file {file_path}: {e}")
    
    return DeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted document {document_id} ({deleted_count} chunks, {len(files_deleted)} file(s) removed)"
    )


@app.delete("/api/documents", response_model=DeleteResponse)
async def delete_all_documents():
    """Delete all documents from the vector database and remove all uploaded files."""
    deleted_count = vector_db_service.delete_all()
    
    # Delete all uploaded files from disk
    upload_dir = "./data/uploads"
    files_deleted = 0
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    files_deleted += 1
            except OSError as e:
                print(f"Warning: Could not delete file {file_path}: {e}")
    
    return DeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted all data ({deleted_count} chunks, {files_deleted} file(s) removed)"
    )


@app.get("/api/documents/{document_id}/download")
async def download_document(document_id: str):
    """
    Download the original uploaded document.
    
    Args:
        document_id: The unique identifier of the document
        
    Returns:
        The original document file
    """
    upload_dir = "./data/uploads"
    
    # Find the file with this document_id
    if not os.path.exists(upload_dir):
        raise HTTPException(status_code=404, detail="Document not found")
    
    for filename in os.listdir(upload_dir):
        if filename.startswith(document_id):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                # Get the original filename from the database
                stats = vector_db_service.get_stats()
                original_filename = None
                for doc in stats.get("documents", []):
                    if doc.get("document_id") == document_id:
                        original_filename = doc.get("filename")
                        break
                
                return FileResponse(
                    path=file_path,
                    filename=original_filename or filename,
                    media_type="application/octet-stream"
                )
    
    raise HTTPException(status_code=404, detail="Document not found")


# ============== Query Endpoints ==============

@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
    Query the RAG system.
    
    This endpoint processes a query through the complete RAG pipeline:
    1. Query understanding
    2. Query embedding
    3. Vector search (retrieval)
    4. Context building
    5. Response generation (augmented generation)
    
    Returns the answer along with detailed pipeline information.
    """
    # Check if we have any documents
    stats = vector_db_service.get_stats()
    if stats["total_chunks"] == 0:
        raise HTTPException(
            status_code=400,
            detail="No documents in the knowledge base. Please upload documents first."
        )
    
    response = rag_pipeline.process_query(request)
    return response


# ============== Learning Endpoints ==============

@app.get("/api/chunking-strategies")
async def get_chunking_strategies():
    """Get information about available chunking strategies."""
    return {
        "strategies": [
            {
                "id": "fixed",
                "name": "Fixed Size",
                "description": "Split text into chunks of fixed character length",
                "best_for": "General purpose, simple documents",
                "pros": ["Predictable chunk sizes", "Simple implementation"],
                "cons": ["May split mid-sentence", "Less semantic coherence"]
            },
            {
                "id": "sentence",
                "name": "Sentence-Based",
                "description": "Split text at sentence boundaries",
                "best_for": "Documents with clear sentence structure",
                "pros": ["Maintains sentence integrity", "Better readability"],
                "cons": ["Variable chunk sizes", "May be too small for short sentences"]
            },
            {
                "id": "paragraph",
                "name": "Paragraph-Based",
                "description": "Split text at paragraph boundaries",
                "best_for": "Well-structured documents with clear paragraphs",
                "pros": ["Maintains paragraph context", "Natural document flow"],
                "cons": ["Large variation in chunk sizes", "Long paragraphs may exceed limits"]
            },
            {
                "id": "semantic",
                "name": "Semantic (Token-Based)",
                "description": "Split based on token count for semantic coherence",
                "best_for": "LLM-optimized chunking",
                "pros": ["Token-aware sizing", "Better for LLM context windows"],
                "cons": ["Requires tokenizer", "Slightly more complex"]
            }
        ]
    }


@app.get("/api/pipeline-overview")
async def get_pipeline_overview():
    """Get an overview of the RAG pipeline steps."""
    return {
        "pipeline_name": "Retrieval-Augmented Generation (RAG)",
        "description": "RAG combines retrieval of relevant information with language model generation",
        "steps": [
            {
                "step": 1,
                "name": "Data Ingestion",
                "description": "Upload and parse documents (PDF, Word, TXT)",
                "icon": "upload"
            },
            {
                "step": 2,
                "name": "Text Chunking",
                "description": "Split documents into smaller, manageable pieces",
                "icon": "scissors"
            },
            {
                "step": 3,
                "name": "Embedding Generation",
                "description": "Convert text chunks into vector representations",
                "icon": "vector"
            },
            {
                "step": 4,
                "name": "Vector Storage",
                "description": "Store embeddings in a vector database for fast retrieval",
                "icon": "database"
            },
            {
                "step": 5,
                "name": "Query Processing",
                "description": "Convert user query into an embedding",
                "icon": "search"
            },
            {
                "step": 6,
                "name": "Similarity Search",
                "description": "Find the most relevant chunks based on vector similarity",
                "icon": "similarity"
            },
            {
                "step": 7,
                "name": "Context Building",
                "description": "Combine retrieved chunks into context for the LLM",
                "icon": "combine"
            },
            {
                "step": 8,
                "name": "Response Generation",
                "description": "Generate answer using LLM with retrieved context",
                "icon": "brain"
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host=settings.host, port=settings.port)
