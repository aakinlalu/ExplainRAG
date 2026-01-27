"""
Vector database service using LanceDB.
"""
import os
import lancedb
import pyarrow as pa
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.config import get_settings
from app.models import DocumentChunk, DocumentInfo


class VectorDBService:
    """Service for managing vector storage and retrieval using LanceDB."""
    
    def __init__(self):
        self._db = None
        self._table = None
    
    @property
    def db(self):
        """Lazy initialization of LanceDB connection."""
        if self._db is None:
            settings = get_settings()
            os.makedirs(settings.lancedb_path, exist_ok=True)
            self._db = lancedb.connect(settings.lancedb_path)
        return self._db
    
    def _get_or_create_table(self):
        """Get existing table or create new one."""
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name in self.db.table_names():
            return self.db.open_table(table_name)
        else:
            # Create table with initial schema
            # We'll create it when we first add data
            return None
    
    def add_chunks(
        self,
        chunks: List[DocumentChunk],
        embeddings: List[List[float]],
        document_id: str,
        filename: str
    ) -> int:
        """
        Add chunks with embeddings to the vector database.
        
        Args:
            chunks: List of document chunks
            embeddings: List of embedding vectors
            document_id: ID of the source document
            filename: Original filename
            
        Returns:
            Number of chunks added
        """
        if not chunks or not embeddings:
            raise ValueError("Cannot add empty chunks or embeddings to the database")
        
        settings = get_settings()
        table_name = settings.collection_name
        
        # Prepare data for LanceDB
        data = []
        for chunk, embedding in zip(chunks, embeddings):
            data.append({
                "id": chunk.id,
                "content": chunk.content,
                "document_id": document_id,
                "filename": filename,
                "chunk_index": chunk.metadata.get("chunk_index", 0),
                "token_count": chunk.token_count,
                "chunking_strategy": chunk.metadata.get("chunking_strategy", "fixed"),
                "upload_time": datetime.utcnow().isoformat(),
                "vector": embedding
            })
        
        if not data:
            raise ValueError("No data to add to the database")
        
        # Add to LanceDB
        if table_name in self.db.table_names():
            table = self.db.open_table(table_name)
            table.add(data)
        else:
            # Create new table
            table = self.db.create_table(table_name, data)
        
        self._table = table
        return len(data)
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks in the vector database.
        
        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            document_ids: Optional filter by document IDs
            
        Returns:
            List of search results with content and scores
        """
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name not in self.db.table_names():
            return []
        
        table = self.db.open_table(table_name)
        
        # Perform vector search
        results = table.search(query_embedding).limit(top_k).to_list()
        
        # Format results
        formatted_results = []
        for result in results:
            # Filter by document_ids if specified
            if document_ids and result.get("document_id") not in document_ids:
                continue
            
            formatted_results.append({
                "content": result.get("content", ""),
                "score": 1 - result.get("_distance", 0),  # Convert distance to similarity
                "metadata": {
                    "document_id": result.get("document_id", ""),
                    "filename": result.get("filename", ""),
                    "chunk_index": result.get("chunk_index", 0),
                    "token_count": result.get("token_count", 0),
                    "chunking_strategy": result.get("chunking_strategy", "")
                }
            })
        
        return formatted_results
    
    def get_all_documents(self) -> List[DocumentInfo]:
        """Get information about all stored documents."""
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name not in self.db.table_names():
            return []
        
        table = self.db.open_table(table_name)
        df = table.to_pandas()
        
        if df.empty:
            return []
        
        # Group by document_id
        documents = []
        for doc_id in df["document_id"].unique():
            doc_chunks = df[df["document_id"] == doc_id]
            
            documents.append(DocumentInfo(
                document_id=doc_id,
                filename=doc_chunks["filename"].iloc[0],
                upload_time=doc_chunks["upload_time"].iloc[0],
                chunk_count=len(doc_chunks),
                status="indexed"
            ))
        
        return documents
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector database."""
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name not in self.db.table_names():
            return {
                "total_documents": 0,
                "total_chunks": 0,
                "documents": []
            }
        
        documents = self.get_all_documents()
        total_chunks = sum(doc.chunk_count for doc in documents)
        
        return {
            "total_documents": len(documents),
            "total_chunks": total_chunks,
            "documents": [doc.model_dump() for doc in documents]
        }
    
    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks for a specific document.
        
        Args:
            document_id: ID of the document to delete
            
        Returns:
            Number of chunks deleted
        """
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name not in self.db.table_names():
            return 0
        
        table = self.db.open_table(table_name)
        df = table.to_pandas()
        
        # Count chunks to delete
        chunks_to_delete = len(df[df["document_id"] == document_id])
        
        if chunks_to_delete == 0:
            return 0
        
        # Delete by filtering and recreating
        remaining_df = df[df["document_id"] != document_id]
        
        if remaining_df.empty:
            # Drop the table if no data remains
            self.db.drop_table(table_name)
        else:
            # Recreate table with remaining data
            self.db.drop_table(table_name)
            remaining_data = remaining_df.to_dict(orient="records")
            self.db.create_table(table_name, remaining_data)
        
        return chunks_to_delete
    
    def delete_all(self) -> int:
        """
        Delete all data from the vector database.
        
        Returns:
            Number of chunks deleted
        """
        settings = get_settings()
        table_name = settings.collection_name
        
        if table_name not in self.db.table_names():
            return 0
        
        table = self.db.open_table(table_name)
        total_chunks = table.count_rows()
        
        self.db.drop_table(table_name)
        
        return total_chunks


# Singleton instance
vector_db_service = VectorDBService()
