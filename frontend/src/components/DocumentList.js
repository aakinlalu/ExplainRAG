import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Database, Calendar, Layers } from 'lucide-react';

const DocumentList = ({ documents, onDelete, onDeleteAll, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            >
              <div className="document-info">
                <div className="document-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="document-name">{doc.filename}</div>
                  <div className="document-meta" style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Layers size={12} />
                      {doc.chunk_count} chunks
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentList;
