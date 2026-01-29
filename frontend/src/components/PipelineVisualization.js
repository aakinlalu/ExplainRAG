import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';

const PipelineStep = ({ step, index, isExpanded, onToggle }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={20} style={{ color: '#10b981' }} />;
      case 'processing':
        return <Loader size={20} style={{ color: '#f59e0b' }} className="animate-spin" />;
      case 'error':
        return <AlertCircle size={20} style={{ color: '#ef4444' }} />;
      default:
        return <Clock size={20} style={{ color: '#94a3b8' }} />;
    }
  };

  const getStatusClass = () => {
    switch (step.status) {
      case 'completed':
        return 'completed';
      case 'processing':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'pending';
    }
  };

  // Support both 'details' and 'data' field names from backend
  const stepDetails = step.details || step.data;
  const stepNumber = step.step || step.step_number || index + 1;
  const hasDetails = stepDetails && Object.keys(stepDetails).length > 0;

  return (
    <motion.div
      className={`pipeline-step ${getStatusClass()}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="step-number">
        {step.status === 'completed' ? (
          <CheckCircle size={18} />
        ) : step.status === 'processing' ? (
          <Loader size={18} className="animate-spin" />
        ) : (
          stepNumber
        )}
      </div>
      
      <div className="step-content" style={{ flex: 1 }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: hasDetails ? 'pointer' : 'default'
          }}
          onClick={hasDetails ? onToggle : undefined}
        >
          <div>
            <div className="step-title">{step.name}</div>
            <div className="step-description">{step.description}</div>
          </div>
          {hasDetails && (
            <button className="btn btn-ghost" style={{ padding: '0.25rem' }}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
        
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="step-details"
            style={{ marginTop: '0.75rem' }}
          >
            {/* Special rendering for Vector Search step with retrieved results */}
            {step.name === 'Vector Search' && stepDetails.retrieved_results ? (
              <div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Top K:</strong> {stepDetails.top_k} | <strong>Results Found:</strong> {stepDetails.results_found}
                </div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Top 5 Retrieved Results:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stepDetails.retrieved_results.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--primary)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          #{result.rank} - {result.filename}
                        </span>
                        <span style={{ 
                          color: 'var(--secondary)', 
                          fontWeight: 500,
                          background: 'var(--bg-secondary)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem'
                        }}>
                          {result.score}% match
                        </span>
                      </div>
                      <div style={{ 
                        color: 'var(--text-muted)', 
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {result.content || result.content_preview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(stepDetails, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
        
        {step.duration_ms !== undefined && (
          <div className="step-duration">
            Completed in {step.duration_ms}ms
          </div>
        )}
      </div>
      
      <div style={{ flexShrink: 0 }}>
        {getStatusIcon()}
      </div>
    </motion.div>
  );
};

const PipelineVisualization = ({ steps = [], title = "Processing Pipeline" }) => {
  const [expandedSteps, setExpandedSteps] = React.useState(new Set());

  const toggleStep = (index) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSteps(new Set(steps.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={expandAll}>
            Expand All
          </button>
          <button className="btn btn-ghost" onClick={collapseAll}>
            Collapse All
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="pipeline-flow">
          {steps.map((step, index) => (
            <PipelineStep
              key={index}
              step={step}
              index={index}
              isExpanded={expandedSteps.has(index)}
              onToggle={() => toggleStep(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PipelineVisualization;
