"""
Document processing service for parsing and chunking documents.
"""
import os
import uuid
import tiktoken
from typing import List, Tuple, Literal
from pypdf import PdfReader
from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.models import DocumentChunk, ChunkingStrategy


class DocumentProcessor:
    """Handles document parsing and chunking with various strategies."""
    
    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text."""
        return len(self.tokenizer.encode(text))
    
    def parse_file(self, file_path: str, filename: str) -> Tuple[str, dict]:
        """
        Parse a file and extract its text content.
        
        Args:
            file_path: Path to the uploaded file
            filename: Original filename
            
        Returns:
            Tuple of (extracted_text, metadata)
        """
        extension = os.path.splitext(filename)[1].lower()
        metadata = {
            "filename": filename,
            "file_type": extension,
        }
        
        if extension == ".pdf":
            text = self._parse_pdf(file_path)
        elif extension in [".docx", ".doc"]:
            text = self._parse_docx(file_path)
        elif extension == ".txt":
            text = self._parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {extension}")
        
        metadata["total_characters"] = len(text)
        metadata["total_tokens"] = self.count_tokens(text)
        
        return text, metadata
    
    def _parse_pdf(self, file_path: str) -> str:
        """Extract text from a PDF file."""
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        return "\n\n".join(text_parts)
    
    def _parse_docx(self, file_path: str) -> str:
        """Extract text from a Word document."""
        doc = DocxDocument(file_path)
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        return "\n\n".join(text_parts)
    
    def _parse_txt(self, file_path: str) -> str:
        """Read a plain text file."""
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    
    def chunk_text(
        self,
        text: str,
        strategy: ChunkingStrategy,
        document_id: str,
        base_metadata: dict
    ) -> List[DocumentChunk]:
        """
        Split text into chunks using the specified strategy.
        
        Args:
            text: The text to chunk
            strategy: Chunking configuration
            document_id: ID of the source document
            base_metadata: Base metadata to include in each chunk
            
        Returns:
            List of DocumentChunk objects
        """
        splitter = self._get_splitter(strategy)
        
        # Create LangChain Document for splitting
        doc = Document(page_content=text, metadata=base_metadata)
        split_docs = splitter.split_documents([doc])
        
        chunks = []
        for i, split_doc in enumerate(split_docs):
            chunk_id = f"{document_id}_chunk_{i}"
            chunk_metadata = {
                **split_doc.metadata,
                "chunk_index": i,
                "document_id": document_id,
                "chunking_strategy": strategy.strategy,
                "chunk_size_setting": strategy.chunk_size,
            }
            
            chunk = DocumentChunk(
                id=chunk_id,
                content=split_doc.page_content,
                metadata=chunk_metadata,
                token_count=self.count_tokens(split_doc.page_content)
            )
            chunks.append(chunk)
        
        return chunks
    
    def _get_splitter(self, strategy: ChunkingStrategy):
        """Get the appropriate text splitter based on strategy."""
        
        if strategy.strategy == "fixed":
            # Fixed-size character chunks
            return RecursiveCharacterTextSplitter(
                chunk_size=strategy.chunk_size,
                chunk_overlap=strategy.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
        
        elif strategy.strategy == "sentence":
            # Split by sentences with overlap
            return RecursiveCharacterTextSplitter(
                chunk_size=strategy.chunk_size,
                chunk_overlap=strategy.chunk_overlap,
                separators=[". ", "! ", "? ", "\n\n", "\n", " "],
                keep_separator=True
            )
        
        elif strategy.strategy == "paragraph":
            # Split by paragraphs
            return RecursiveCharacterTextSplitter(
                chunk_size=strategy.chunk_size,
                chunk_overlap=strategy.chunk_overlap,
                separators=["\n\n", "\n", ". ", " "],
                keep_separator=True
            )
        
        elif strategy.strategy == "semantic":
            # Token-based splitting (more semantic)
            return RecursiveCharacterTextSplitter(
                chunk_size=strategy.chunk_size,
                chunk_overlap=strategy.chunk_overlap,
                length_function=self.count_tokens,
                separators=["\n\n", "\n", ". ", ", ", " ", ""]
            )
        
        else:
            raise ValueError(f"Unknown chunking strategy: {strategy.strategy}")
    
    def get_chunk_previews(self, chunks: List[DocumentChunk], max_previews: int = 5) -> List[dict]:
        """Get preview information for chunks."""
        previews = []
        for chunk in chunks[:max_previews]:
            preview = {
                "id": chunk.id,
                "preview": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                "token_count": chunk.token_count,
                "char_count": len(chunk.content)
            }
            previews.append(preview)
        return previews


# Singleton instance
document_processor = DocumentProcessor()
