import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, BookOpen, Loader, ExternalLink } from 'lucide-react';
import { getDocumentDownloadUrl } from '../services/api';

const ChatInterface = ({ onSendMessage, messages, loading, pipelineSteps }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <Bot size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Ask a Question</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Query your uploaded documents using natural language.
              <br />
              The RAG system will retrieve relevant context and generate an answer.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              className={`message ${message.role}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="message-avatar">
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className="message-content">
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="sources-panel">
                    <div className="sources-title">
                      <BookOpen size={14} />
                      Retrieved Sources ({message.sources.length})
                    </div>
                    {message.sources.map((source, i) => (
                      <div 
                        key={i} 
                        className="source-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const documentId = source.metadata?.document_id;
                          if (documentId) {
                            window.open(getDocumentDownloadUrl(documentId), '_blank');
                          }
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.25rem'
                        }}>
                          <span style={{ 
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'var(--primary)',
                            textDecoration: 'underline'
                          }}>
                            {source.metadata?.filename || 'Unknown source'}
                            <ExternalLink size={12} />
                          </span>
                          <span className="source-score">
                            {(source.score * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)',
                          maxHeight: '60px',
                          overflow: 'hidden'
                        }}>
                          {source.content.substring(0, 150)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            className="message assistant"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="message-avatar">
              <Loader size={18} className="animate-spin" />
            </div>
            <div className="message-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Processing your query through the RAG pipeline...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!input.trim() || loading}
            style={{ padding: '0.75rem 1.25rem' }}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
