"""
Embedding service for generating vector representations of text.
"""
from typing import List
import numpy as np
from langchain_ollama import OllamaEmbeddings

from app.config import get_settings


class EmbeddingService:
    """Service for generating text embeddings using Ollama."""
    
    def __init__(self):
        self._embeddings = None
    
    @property
    def embeddings(self) -> OllamaEmbeddings:
        """Lazy initialization of embeddings model."""
        if self._embeddings is None:
            settings = get_settings()
            self._embeddings = OllamaEmbeddings(
                model=settings.embedding_model,
                base_url=settings.ollama_base_url
            )
        return self._embeddings
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        return self.embeddings.embed_query(text)
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        return self.embeddings.embed_documents(texts)
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embedding vectors."""
        settings = get_settings()
        # mxbai-embed-large has 1024 dimensions
        if "mxbai-embed-large" in settings.embedding_model:
            return 1024
        # nomic-embed-text has 768 dimensions
        elif "nomic-embed-text" in settings.embedding_model:
            return 768
        # snowflake-arctic-embed has 1024 dimensions
        elif "snowflake-arctic-embed" in settings.embedding_model:
            return 1024
        else:
            # Default fallback
            return 768
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0 to 1)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))


# Singleton instance
embedding_service = EmbeddingService()
