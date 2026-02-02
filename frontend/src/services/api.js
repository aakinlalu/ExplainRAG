import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document APIs
export const uploadDocument = async (file, chunkingConfig) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('strategy', chunkingConfig.strategy);
  formData.append('chunk_size', chunkingConfig.chunkSize);
  formData.append('chunk_overlap', chunkingConfig.chunkOverlap);

  const response = await api.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/api/documents');
  return response.data;
};

export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/api/documents/${documentId}`);
  return response.data;
};

export const deleteAllDocuments = async () => {
  const response = await api.delete('/api/documents');
  return response.data;
};

export const getDocumentDownloadUrl = (documentId) => {
  return `${API_BASE_URL}/api/documents/${documentId}/download`;
};

export const getDocumentChunks = async (documentId) => {
  const response = await api.get(`/api/documents/${documentId}/chunks`);
  return response.data;
};

// Query APIs
export const queryRAG = async (query, topK = 5) => {
  const response = await api.post('/api/query', {
    query,
    top_k: topK,
    include_sources: true,
  });
  return response.data;
};

// Learning APIs
export const getChunkingStrategies = async () => {
  const response = await api.get('/api/chunking-strategies');
  return response.data;
};

export const getPipelineOverview = async () => {
  const response = await api.get('/api/pipeline-overview');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
