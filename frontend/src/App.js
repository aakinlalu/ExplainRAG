import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  MessageSquare,
  BookOpen,
  Database,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import {
  FileUpload,
  ChunkingConfig,
  DocumentList,
  ChatInterface,
  PipelineVisualization,
  PipelineOverview
} from './components';

import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  deleteAllDocuments,
  queryRAG,
  getPipelineOverview
} from './services/api';

const TABS = {
  LEARN: 'learn',
  INGEST: 'ingest',
  QUERY: 'query',
  MANAGE: 'manage'
};

function App() {
  // State
  const [activeTab, setActiveTab] = useState(TABS.LEARN);
  const [selectedFile, setSelectedFile] = useState(null);
  const [chunkingConfig, setChunkingConfig] = useState({
    strategy: 'fixed',
    chunkSize: 500,
    chunkOverlap: 50
  });
  const [processingSteps, setProcessingSteps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [queryPipelineSteps, setQueryPipelineSteps] = useState([]);
  const [pipelineOverview, setPipelineOverview] = useState({ steps: [] });
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Notifications
  const [notification, setNotification] = useState(null);

  // Load initial data
  useEffect(() => {
    loadDocuments();
    loadPipelineOverview();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch (error) {
      showNotification('Failed to load documents', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadPipelineOverview = async () => {
    try {
      const data = await getPipelineOverview();
      setPipelineOverview(data);
    } catch (error) {
      console.error('Failed to load pipeline overview:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handlers
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setProcessingSteps([]);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setProcessingSteps([]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setProcessingSteps([]);

      // Simulate step-by-step progress for better UX
      const mockSteps = [
        { step: 1, name: 'File Upload', status: 'processing', description: 'Uploading file...' },
      ];
      setProcessingSteps([...mockSteps]);

      const result = await uploadDocument(selectedFile, chunkingConfig);
      
      setProcessingSteps(result.processing_steps.map(s => ({
        ...s,
        status: 'completed'
      })));

      showNotification(`Successfully processed "${result.filename}" into ${result.total_chunks} chunks!`);
      
      // Refresh documents list
      await loadDocuments();
      
      // Clear selection after short delay
      setTimeout(() => {
        setSelectedFile(null);
      }, 2000);

    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to upload document';
      showNotification(errorMessage, 'error');
      setProcessingSteps(prev => prev.map(s => 
        s.status === 'processing' ? { ...s, status: 'error' } : s
      ));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteDocument(documentId);
      showNotification('Document deleted successfully');
      await loadDocuments();
    } catch (error) {
      showNotification('Failed to delete document', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all documents? This cannot be undone.')) {
      return;
    }

    try {
      await deleteAllDocuments();
      showNotification('All documents deleted successfully');
      await loadDocuments();
    } catch (error) {
      showNotification('Failed to delete documents', 'error');
    }
  };

  const handleSendMessage = async (query) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQueryPipelineSteps([]);

    try {
      setQuerying(true);
      const result = await queryRAG(query);

      // Add assistant message with sources
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        sources: result.retrieved_chunks
      }]);

      setQueryPipelineSteps(result.pipeline_steps);

    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to process query';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${errorMessage}. Please make sure you have uploaded documents first.`
      }]);
    } finally {
      setQuerying(false);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.LEARN:
        return (
          <motion.div
            key="learn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PipelineOverview steps={pipelineOverview.steps} />
          </motion.div>
        );

      case TABS.INGEST:
        return (
          <motion.div
            key="ingest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <Upload size={20} />
                    Upload Document
                  </h3>
                </div>
                <div className="card-body">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    onClear={handleClearFile}
                    disabled={uploading}
                  />

                  <ChunkingConfig
                    config={chunkingConfig}
                    onChange={setChunkingConfig}
                    disabled={uploading}
                  />

                  <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Process Document
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <PipelineVisualization
                  steps={processingSteps}
                  title="Ingestion Pipeline"
                />
                
                {processingSteps.length === 0 && (
                  <div className="card">
                    <div className="card-body">
                      <div className="empty-state">
                        <Upload size={48} style={{ opacity: 0.3 }} />
                        <p style={{ marginTop: '1rem' }}>
                          Upload a document to see the processing pipeline in action
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );

      case TABS.QUERY:
        return (
          <motion.div
            key="query"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="grid-2">
              <div className="card" style={{ height: 'fit-content' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <MessageSquare size={20} />
                    Query Your Documents
                  </h3>
                  <span className="badge badge-success">
                    {documents.length} docs indexed
                  </span>
                </div>
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  loading={querying}
                />
              </div>

              <div>
                {queryPipelineSteps.length > 0 && (
                  <PipelineVisualization
                    steps={queryPipelineSteps}
                    title="Query Pipeline"
                  />
                )}
                
                {queryPipelineSteps.length === 0 && (
                  <div className="card">
                    <div className="card-body">
                      <div className="empty-state">
                        <MessageSquare size={48} style={{ opacity: 0.3 }} />
                        <p style={{ marginTop: '1rem' }}>
                          Ask a question to see the RAG pipeline in action
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Watch how your query is embedded, matched against the vector 
                          database, and used to generate a response.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );

      case TABS.MANAGE:
        return (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Database size={20} />
                  Knowledge Base Management
                </h3>
              </div>
              <div className="card-body">
                <DocumentList
                  documents={documents}
                  onDelete={handleDeleteDocument}
                  onDeleteAll={handleDeleteAll}
                  loading={loadingDocs}
                />
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <BookOpen size={24} />
            </div>
            <span>ExplanRAG</span>
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === TABS.LEARN ? 'active' : ''}`}
              onClick={() => setActiveTab(TABS.LEARN)}
            >
              <BookOpen size={18} />
              Learn
            </button>
            <button
              className={`nav-tab ${activeTab === TABS.INGEST ? 'active' : ''}`}
              onClick={() => setActiveTab(TABS.INGEST)}
            >
              <Upload size={18} />
              Ingest
            </button>
            <button
              className={`nav-tab ${activeTab === TABS.QUERY ? 'active' : ''}`}
              onClick={() => setActiveTab(TABS.QUERY)}
            >
              <MessageSquare size={18} />
              Query
            </button>
            <button
              className={`nav-tab ${activeTab === TABS.MANAGE ? 'active' : ''}`}
              onClick={() => setActiveTab(TABS.MANAGE)}
            >
              <Database size={18} />
              Manage
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {renderTabContent()}
        </AnimatePresence>
      </main>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              padding: '1rem 1.5rem',
              background: notification.type === 'error' ? 'var(--danger)' : 'var(--secondary)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              zIndex: 1000
            }}
          >
            {notification.type === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
