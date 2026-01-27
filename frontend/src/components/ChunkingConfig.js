import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

const strategies = [
  {
    id: 'fixed',
    name: 'Fixed Size',
    description: 'Split text into chunks of fixed character length',
    icon: '📏',
    details: 'Best for: General purpose documents with consistent content density'
  },
  {
    id: 'sentence',
    name: 'Sentence-Based',
    description: 'Split text at sentence boundaries',
    icon: '📝',
    details: 'Best for: Articles, essays, and narrative text'
  },
  {
    id: 'paragraph',
    name: 'Paragraph-Based',
    description: 'Split text at paragraph boundaries',
    icon: '📄',
    details: 'Best for: Well-structured documents with clear sections'
  },
  {
    id: 'semantic',
    name: 'Semantic (Token)',
    description: 'Token-based splitting for LLM optimization',
    icon: '🧠',
    details: 'Best for: Optimizing context window usage with LLMs'
  }
];

const ChunkingConfig = ({ config, onChange, disabled }) => {
  const handleStrategyChange = (strategyId) => {
    onChange({ ...config, strategy: strategyId });
  };

  const handleChunkSizeChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onChange({ ...config, chunkSize: Math.min(Math.max(value, 100), 2000) });
    }
  };

  const handleOverlapChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onChange({ ...config, chunkOverlap: Math.min(Math.max(value, 0), 500) });
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Chunking Strategy
            <div className="tooltip">
              <Info size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="tooltip-text">
                Different strategies affect how your document is split
              </span>
            </div>
          </span>
        </label>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '0.75rem',
          marginTop: '0.5rem'
        }}>
          {strategies.map((strategy) => (
            <motion.div
              key={strategy.id}
              className={`strategy-card ${config.strategy === strategy.id ? 'selected' : ''}`}
              onClick={() => !disabled && handleStrategyChange(strategy.id)}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              style={{ 
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                {strategy.icon}
              </div>
              <div className="strategy-name">{strategy.name}</div>
              <div className="strategy-desc">{strategy.description}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">
            Chunk Size (characters)
          </label>
          <input
            type="number"
            className="form-input"
            value={config.chunkSize}
            onChange={handleChunkSizeChange}
            min={100}
            max={2000}
            step={50}
            disabled={disabled}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Range: 100 - 2000 characters
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">
            Chunk Overlap (characters)
          </label>
          <input
            type="number"
            className="form-input"
            value={config.chunkOverlap}
            onChange={handleOverlapChange}
            min={0}
            max={500}
            step={10}
            disabled={disabled}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Range: 0 - 500 characters
          </small>
        </div>
      </div>

      {/* Visual representation of chunking */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        background: 'var(--bg-tertiary)', 
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem'
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Preview Visualization</div>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((_, i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(config.chunkSize / 20, 80)}px` }}
              transition={{ delay: i * 0.1 }}
              style={{
                height: '20px',
                background: `hsl(${220 + i * 30}, 70%, 50%)`,
                borderRadius: '4px',
                marginLeft: i > 0 ? `-${Math.min(config.chunkOverlap / 50, 10)}px` : 0,
                opacity: 0.8
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Overlapping sections ensure context continuity between chunks
        </div>
      </div>
    </div>
  );
};

export default ChunkingConfig;
