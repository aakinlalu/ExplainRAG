"""
Pydantic models for API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# ============== Chunking Models ==============

class ChunkingStrategy(BaseModel):
    """Configuration for document chunking."""
    strategy: Literal["fixed", "sentence", "paragraph", "semantic"] = "fixed"
    chunk_size: int = Field(default=500, ge=100, le=2000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)


class DocumentChunk(BaseModel):
    """Represents a single chunk of a document."""
    id: str
    content: str
    metadata: dict
    embedding: Optional[List[float]] = None
    token_count: int = 0


# ============== Document Models ==============

class DocumentUploadResponse(BaseModel):
    """Response after document upload and processing."""
    document_id: str
    filename: str
    total_chunks: int
    chunk_previews: List[dict]
    processing_steps: List[dict]


class DocumentInfo(BaseModel):
    """Information about a stored document."""
    document_id: str
    filename: str
    upload_time: str
    chunk_count: int
    status: str


# ============== Query Models ==============

class QueryRequest(BaseModel):
    """Request for RAG query."""
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    include_sources: bool = True


class RetrievedChunk(BaseModel):
    """A chunk retrieved from the vector database."""
    content: str
    score: float
    metadata: dict


class QueryResponse(BaseModel):
    """Response from RAG query."""
    query: str
    answer: str
    retrieved_chunks: List[RetrievedChunk]
    pipeline_steps: List[dict]


# ============== Pipeline Step Models ==============

class PipelineStep(BaseModel):
    """Represents a step in the RAG pipeline."""
    step_number: int
    name: str
    description: str
    status: Literal["pending", "processing", "completed", "error"]
    data: Optional[dict] = None
    duration_ms: Optional[int] = None


# ============== Database Management Models ==============

class DeleteRequest(BaseModel):
    """Request to delete documents."""
    document_ids: Optional[List[str]] = None
    delete_all: bool = False


class DeleteResponse(BaseModel):
    """Response after deletion."""
    deleted_count: int
    message: str


class DatabaseStats(BaseModel):
    """Statistics about the vector database."""
    total_documents: int
    total_chunks: int
    documents: List[DocumentInfo]
