import React from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Scissors, 
  Binary, 
  Database, 
  Search, 
  GitCompare, 
  Combine, 
  Brain,
  ArrowRight
} from 'lucide-react';

const icons = {
  upload: Upload,
  scissors: Scissors,
  vector: Binary,
  database: Database,
  search: Search,
  similarity: GitCompare,
  combine: Combine,
  brain: Brain
};

const PipelineOverview = ({ steps }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Brain size={20} color="#6366f1" />
          RAG Pipeline Overview
        </h3>
      </div>
      <div className="card-body">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Retrieval-Augmented Generation (RAG) combines information retrieval with 
          language model generation to provide accurate, context-grounded responses.
        </p>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center'
        }}>
          {steps.map((step, index) => {
            const IconComponent = icons[step.icon] || Database;
            
            return (
              <React.Fragment key={step.step}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    minWidth: '120px',
                    maxWidth: '150px',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: `linear-gradient(135deg, #6366f1, #10b981)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}>
                    <IconComponent size={24} color="#ffffff" strokeWidth={2} />
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-muted)',
                    marginBottom: '0.25rem'
                  }}>
                    Step {step.step}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    {step.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4
                  }}>
                    {step.description}
                  </div>
                </motion.div>

                {index < steps.length - 1 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: 'var(--primary)'
                  }}>
                    <ArrowRight size={20} strokeWidth={2} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--primary)',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid var(--primary)'
        }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            💡 How It Works
          </h4>
          <ol style={{ 
            paddingLeft: '1.25rem', 
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.7
          }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Ingestion Phase:</strong> Documents are uploaded, parsed, and split into smaller chunks.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Embedding Phase:</strong> Each chunk is converted to a vector representation and stored.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Query Phase:</strong> User questions are embedded and matched against stored vectors.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Generation Phase:</strong> Relevant chunks provide context for the LLM to generate accurate answers.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PipelineOverview;
