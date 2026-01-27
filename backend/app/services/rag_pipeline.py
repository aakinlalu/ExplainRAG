"""
RAG pipeline service for query processing and generation.
"""
import time
from typing import List, Dict, Any
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import get_settings
from app.models import QueryRequest, QueryResponse, RetrievedChunk, PipelineStep
from app.services.embedding_service import embedding_service
from app.services.vector_db_service import vector_db_service


class RAGPipeline:
    """
    Retrieval-Augmented Generation pipeline.
    Handles the complete flow from query to generated response.
    """
    
    def __init__(self):
        self._llm = None
    
    @property
    def llm(self) -> ChatOllama:
        """Lazy initialization of the language model."""
        if self._llm is None:
            settings = get_settings()
            self._llm = ChatOllama(
                model=settings.llm_model,
                base_url=settings.ollama_base_url,
                temperature=0.7
            )
        return self._llm
    
    def process_query(self, request: QueryRequest) -> QueryResponse:
        """
        Process a RAG query through the complete pipeline.
        
        Args:
            request: Query request containing the question and parameters
            
        Returns:
            QueryResponse with answer and pipeline details
        """
        pipeline_steps = []
        
        # Step 1: Query Understanding
        start_time = time.time()
        pipeline_steps.append(PipelineStep(
            step_number=1,
            name="Query Understanding",
            description="Analyzing the user's question to prepare for retrieval",
            status="completed",
            data={
                "original_query": request.query,
                "query_length": len(request.query),
                "query_tokens": len(request.query.split())
            },
            duration_ms=int((time.time() - start_time) * 1000)
        ))
        
        # Step 2: Query Embedding
        start_time = time.time()
        query_embedding = embedding_service.embed_text(request.query)
        pipeline_steps.append(PipelineStep(
            step_number=2,
            name="Query Embedding",
            description="Converting query to vector representation using OpenAI embeddings",
            status="completed",
            data={
                "embedding_model": get_settings().embedding_model,
                "embedding_dimension": len(query_embedding),
                "embedding_preview": query_embedding[:5]  # First 5 values
            },
            duration_ms=int((time.time() - start_time) * 1000)
        ))
        
        # Step 3: Vector Search
        start_time = time.time()
        search_results = vector_db_service.search(
            query_embedding=query_embedding,
            top_k=request.top_k
        )
        pipeline_steps.append(PipelineStep(
            step_number=3,
            name="Vector Search",
            description=f"Searching vector database for top {request.top_k} similar chunks",
            status="completed",
            data={
                "top_k": request.top_k,
                "results_found": len(search_results),
                "similarity_scores": [r["score"] for r in search_results]
            },
            duration_ms=int((time.time() - start_time) * 1000)
        ))
        
        # Convert to RetrievedChunk objects
        retrieved_chunks = [
            RetrievedChunk(
                content=r["content"],
                score=r["score"],
                metadata=r["metadata"]
            )
            for r in search_results
        ]
        
        # Step 4: Context Building
        start_time = time.time()
        context = self._build_context(retrieved_chunks)
        pipeline_steps.append(PipelineStep(
            step_number=4,
            name="Context Building",
            description="Combining retrieved chunks into context for the LLM",
            status="completed",
            data={
                "context_length": len(context),
                "num_chunks_used": len(retrieved_chunks),
                "context_preview": context[:500] + "..." if len(context) > 500 else context
            },
            duration_ms=int((time.time() - start_time) * 1000)
        ))
        
        # Step 5: Response Generation
        start_time = time.time()
        answer = self._generate_response(request.query, context)
        pipeline_steps.append(PipelineStep(
            step_number=5,
            name="Response Generation",
            description="Generating answer using LLM with retrieved context",
            status="completed",
            data={
                "llm_model": get_settings().llm_model,
                "answer_length": len(answer),
                "answer_preview": answer[:200] + "..." if len(answer) > 200 else answer
            },
            duration_ms=int((time.time() - start_time) * 1000)
        ))
        
        return QueryResponse(
            query=request.query,
            answer=answer,
            retrieved_chunks=retrieved_chunks if request.include_sources else [],
            pipeline_steps=[step.model_dump() for step in pipeline_steps]
        )
    
    def _build_context(self, chunks: List[RetrievedChunk]) -> str:
        """Build context string from retrieved chunks."""
        if not chunks:
            return "No relevant context found in the knowledge base."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.metadata.get("filename", "Unknown source")
            context_parts.append(
                f"[Source {i}: {source}]\n{chunk.content}"
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    def _generate_response(self, query: str, context: str) -> str:
        """Generate response using the LLM with context."""
        
        system_prompt = """You are a helpful assistant that answers questions based on the provided context. 
        
Your task is to:
1. Carefully read the context provided
2. Answer the user's question based ONLY on the information in the context
3. If the context doesn't contain enough information to answer, say so clearly
4. Cite the sources when possible (e.g., "According to Source 1...")
5. Be concise but comprehensive

Remember: Only use information from the provided context. Do not make up information."""

        user_prompt = f"""Context:
{context}

---

Question: {query}

Please provide a helpful answer based on the context above."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = self.llm.invoke(messages)
        return response.content


# Singleton instance
rag_pipeline = RAGPipeline()
