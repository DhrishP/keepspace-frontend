import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, Edit2, Check, Copy, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { downloadDocument } from '../utils/download';

interface FilePreviewProps {
  document: any;
  onClose: () => void;
  onUpdateDescription: (id: string, description: string) => Promise<void>;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  document: doc,
  onClose,
  onUpdateDescription,
}) => {
  const [desc, setDesc] = useState(doc.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  const handleDownloadClick = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await downloadDocument(getMediaUrl(), doc.name);
    setIsDownloading(false);
  };

  const isTextOrMd = 
    doc.mime_type?.startsWith('text/') || 
    doc.name.endsWith('.txt') || 
    doc.name.endsWith('.md') ||
    doc.name.endsWith('.json') ||
    doc.name.endsWith('.csv') ||
    doc.name.endsWith('.xml') ||
    doc.name.endsWith('.js') ||
    doc.name.endsWith('.ts');

  useEffect(() => {
    if (isTextOrMd) {
      setIsLoadingText(true);
      fetch(getMediaUrl())
        .then(res => {
          if (!res.ok) throw new Error("Failed to load file preview");
          return res.text();
        })
        .then(text => {
          setTextContent(text);
          setIsLoadingText(false);
        })
        .catch(err => {
          console.error(err);
          setTextContent("Error loading preview content. Please download the file to view.");
          setIsLoadingText(false);
        });
    }
  }, [doc.id]);

  const handleSaveDescription = async () => {
    setIsSaving(true);
    await onUpdateDescription(doc.id, desc);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCopyNotes = () => {
    if (doc.description) {
      navigator.clipboard.writeText(doc.description);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getMediaUrl = () => {
    if (doc.type === 'link') return doc.url;
    return `${API_BASE_URL}/api/documents/${doc.id}/download`;
  };

  // Render media viewer depending on document type
  const renderViewer = () => {
    if (isTextOrMd) {
      if (isLoadingText) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-muted)' }}>
            Loading text preview...
          </div>
        );
      }
      return (
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '16px', 
          borderRadius: 'var(--border-radius-md)', 
          maxHeight: '400px', 
          overflowY: 'auto', 
          fontFamily: doc.name.endsWith('.md') ? 'var(--font-sans)' : 'var(--font-mono)',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        }}>
          {textContent || 'Empty document'}
        </div>
      );
    }

    switch (doc.type) {
      case 'image':
        return (
          <img 
            className="preview-media" 
            src={getMediaUrl()} 
            alt={doc.name} 
          />
        );
      case 'video':
        return (
          <video 
            className="preview-media" 
            controls 
            autoPlay
            src={getMediaUrl()}
          />
        );
      case 'pdf':
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-toolbar">
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={() => window.open(getMediaUrl(), '_blank')}
                title="Open PDF in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in Tab</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download PDF file"
              >
                {isDownloading ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
            <iframe 
              className="preview-pdf-frame" 
              src={`${getMediaUrl()}#toolbar=1`} 
              title={doc.name}
            />
          </div>
        );
      case 'link':
        return (
          <div className="link-preview-box">
            {doc.thumbnail_url && (
              <img className="link-preview-img" src={doc.thumbnail_url} alt={doc.name} />
            )}
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{doc.name}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
              {doc.url}
            </p>
            <a 
              href={doc.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary" 
              style={{ marginTop: '10px', gap: '8px' }}
            >
              <ExternalLink size={16} />
              Open Website
            </a>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No preview helper configured for this format.</p>
            <button 
              type="button" 
              onClick={handleDownloadClick} 
              className="btn btn-primary" 
              style={{ marginTop: '16px' }}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 size={16} className="spin-icon" /> : <Download size={16} />}
              <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
            <h3 className="modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.name}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Type: {doc.type.toUpperCase()} • Created on {new Date(doc.created_at).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {doc.type !== 'link' && (
              <button 
                type="button"
                className="card-action-btn" 
                onClick={handleDownloadClick}
                title={isDownloading ? "Downloading file..." : "Download"}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={18} className="spin-icon" /> : <Download size={18} />}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="preview-body">
          {renderViewer()}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Notes & Description
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {doc.description && !isEditing && (
                <button 
                  className="card-action-btn" 
                  onClick={handleCopyNotes}
                  title={isCopied ? "Copied!" : "Copy Notes"}
                  style={{ color: isCopied ? 'var(--success)' : undefined }}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
              {isEditing ? (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
                  onClick={handleSaveDescription}
                  disabled={isSaving}
                >
                  <Check size={14} />
                  Save
                </button>
              ) : (
                <button 
                  className="card-action-btn" 
                  onClick={() => setIsEditing(true)}
                  title="Edit Notes"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <textarea
              className="form-textarea"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Add description, notes, or tags here..."
              style={{ minHeight: '60px' }}
            />
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-md)', minHeight: '44px', fontStyle: doc.description ? 'normal' : 'italic' }}>
              {doc.description || 'No description provided. Click the edit icon to add notes.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
