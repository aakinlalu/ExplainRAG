import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, File, FileText, X } from 'lucide-react';

const FileUpload = ({ onFileSelect, selectedFile, onClear, disabled }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled
  });

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return <File size={24} style={{ color: '#ef4444' }} />;
      case 'docx':
      case 'doc':
        return <File size={24} style={{ color: '#3b82f6' }} />;
      default:
        return <FileText size={24} style={{ color: '#6b7280' }} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="document-item"
        style={{ marginBottom: '1rem' }}
      >
        <div className="document-info">
          <div className="document-icon" style={{ background: 'var(--bg-tertiary)' }}>
            {getFileIcon(selectedFile.name)}
          </div>
          <div>
            <div className="document-name">{selectedFile.name}</div>
            <div className="document-meta">{formatFileSize(selectedFile.size)}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={onClear}
          disabled={disabled}
          style={{ padding: '0.5rem' }}
        >
          <X size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      style={{ marginBottom: '1.5rem' }}
    >
      <input {...getInputProps()} />
      <motion.div
        animate={{
          scale: isDragActive ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <Upload className="dropzone-icon" />
        <p className="dropzone-text">
          {isDragActive
            ? 'Drop your file here...'
            : 'Drag & drop a document, or click to select'}
        </p>
        <p className="dropzone-hint">
          Supports PDF, DOCX, DOC, and TXT files
        </p>
      </motion.div>
    </div>
  );
};

export default FileUpload;
