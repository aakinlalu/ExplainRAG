"""
Configuration settings for the RAG application.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    


    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "mxbai-embed-large"
    llm_model: str = "gemma3:12b"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Vector Database Configuration
    lancedb_path: str = "./data/lancedb"
    collection_name: str = "documents"
    
    # Chunking defaults
    default_chunk_size: int = 500
    default_chunk_overlap: int = 50
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
