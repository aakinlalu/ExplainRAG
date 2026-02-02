import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Database, Calendar, Layers, ChevronDown, ChevronUp, Hash, Download } from 'lucide-react';
import { getDocumentChunks } from '../services/api';

const DocumentList = ({ documents, onDelete, onDeleteAll, loading }) => {
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [chunks, setChunks] = useState({});
  const [loadingChunks, setLoadingChunks] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadChunksAsCSV = (documentId, filename) => {
    const docChunks = chunks[documentId];
    if (!docChunks || docChunks.length === 0) return;

    // CSV header
    const headers = ['chunk_index', 'token_count', 'chunking_strategy', 'content'];
    
    // Escape CSV fields (handle commas, quotes, and newlines)
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const csvRows = [
      headers.join(','),
      ...docChunks.map(chunk => 
        [
          chunk.chunk_index + 1,
          chunk.token_count,
          escapeCSV(chunk.chunking_strategy),
          escapeCSV(chunk.content)
        ].join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.replace(/\.[^/.]+$/, '')}_chunks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleChunks = async (documentId) => {
    if (expandedDoc === documentId) {
      setExpandedDoc(null);
      return;
    }

    // If we already have chunks loaded, just expand
    if (chunks[documentId]) {
      setExpandedDoc(documentId);
      return;
    }

    // Fetch chunks
    setLoadingChunks(documentId);
    try {
      const data = await getDocumentChunks(documentId);
      setChunks(prev => ({ ...prev, [documentId]: data.chunks }));
      setExpandedDoc(documentId);
    } catch (error) {
      console.error('Failed to fetch chunks:', error);
    } finally {
      setLoadingChunks(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <Database className="empty-state-icon" />
        <p>No documents in the knowledge base</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Upload a document to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} />
          <span style={{ fontWeight: 500 }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
          </span>
        </div>
        <button
          className="btn btn-danger"
          onClick={onDeleteAll}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '0.375rem 0.75rem' }}
        >
          <Trash2 size={14} />
          Clear All
        </button>
      </div>

      <div className="documents-list">
        <AnimatePresence>
          {documents.map((doc, index) => (
            <motion.div
              key={doc.document_id}
              className="document-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              style={{ flexDirection: 'column', alignItems: 'stretch' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="document-info">
                  <div className="document-icon">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="document-name">{doc.filename}</div>
                    <div className="document-meta" style={{ display: 'flex', gap: '1rem' }}>
                      <span 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          cursor: 'pointer',
                          color: expandedDoc === doc.document_id ? 'var(--primary)' : 'inherit'
                        }}
                        onClick={() => handleToggleChunks(doc.document_id)}
                      >
                        <Layers size={12} />
                        {doc.chunk_count} chunks
                        {loadingChunks === doc.document_id ? (
                          <span style={{ marginLeft: '0.25rem' }}>...</span>
                        ) : expandedDoc === doc.document_id ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {formatDate(doc.upload_time)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => onDelete(doc.document_id)}
                  disabled={loading}
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              {/* Chunks Dropdown */}
              <AnimatePresence>
                {expandedDoc === doc.document_id && chunks[doc.document_id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ 
                      marginTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.75rem',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Text Chunks
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={() => downloadChunksAsCSV(doc.document_id, doc.filename)}
                        style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.25rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: 'var(--primary)'
                        }}
                        title="Download chunks as CSV"
                      >
                        <Download size={12} />
                        CSV
                      </button>
                    </div>
                    {chunks[doc.document_id].map((chunk, chunkIndex) => (
                      <div
                        key={chunk.id || chunkIndex}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                          paddingBottom: '0.5rem',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            fontWeight: 600,
                            color: 'var(--primary)'
                          }}>
                            <Hash size={12} />
                            Chunk {chunk.chunk_index + 1}
                          </span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '4px'
                          }}>
                            {chunk.token_count} tokens
                          </span>
                        </div>
                        <div style={{ 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                          color: 'var(--text-primary)'
                        }}>
                          {chunk.content}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentList;
