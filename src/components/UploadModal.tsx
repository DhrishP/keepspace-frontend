import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FolderPlus, Link2, File } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface UploadModalProps {
  initialTab: 'file' | 'folder' | 'link';
  onClose: () => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onSaveLink: (url: string, description: string, parentId?: string | null) => Promise<void>;
  onUploadFiles: (files: FileList, parentId?: string | null) => Promise<void>;
  currentFolderId: string | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  initialTab,
  onClose,
  onCreateFolder,
  onSaveLink,
  onUploadFiles,
  currentFolderId
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'folder' | 'link'>(initialTab);
  
  // Folder inputs
  const [folderName, setFolderName] = useState('');
  
  // Link inputs
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Destination Folder Selector States
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch flat folders on modal load
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/all-folders`)
      .then(res => res.json())
      .then(data => setAllFolders(data || []))
      .catch(err => console.error("Error fetching all folders:", err));
  }, []);

  // Folder Submit
  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateFolder(folderName, selectedFolderId || null);
      setFolderName('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Link Submit
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onSaveLink(linkUrl, linkDesc, selectedFolderId || null);
      setLinkUrl('');
      setLinkDesc('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // File Picker / Dropzone Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIsSubmitting(true);
      await onUploadFiles(e.dataTransfer.files, selectedFolderId || null);
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsSubmitting(true);
      await onUploadFiles(e.target.files, selectedFolderId || null);
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title">Add Content</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            Upload Files
          </button>
          <button 
            className={`modal-tab ${activeTab === 'folder' ? 'active' : ''}`}
            onClick={() => setActiveTab('folder')}
          >
            Create Folder
          </button>
          <button 
            className={`modal-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            Save Link
          </button>
        </div>

        {/* Destination Folder Selector */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Destination Folder</label>
          <select 
            className="form-input" 
            value={selectedFolderId} 
            onChange={(e) => setSelectedFolderId(e.target.value)}
            disabled={isSubmitting}
            style={{ 
              background: 'var(--bg-secondary)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            <option value="">Root / Main Vault</option>
            {allFolders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Tab 1: Upload Files */}
        {activeTab === 'file' && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              onChange={handleFileChange}
            />
            <div 
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="dropzone-icon" size={40} />
              <p className="dropzone-text">
                {isSubmitting ? 'Uploading items...' : 'Drag & drop files here, or click to browse'}
              </p>
              <span className="dropzone-subtext">
                Supports PDFs, Photos, Videos & Documents up to 100MB
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Create Folder */}
        {activeTab === 'folder' && (
          <form onSubmit={handleFolderSubmit}>
            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Invoices, Family Trip" 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Save Link */}
        {activeTab === 'link' && (
          <form onSubmit={handleLinkSubmit}>
            <div className="form-group">
              <label className="form-label">Link Address / URL</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://example.com" 
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Description (Optional)</label>
              <textarea 
                className="form-textarea" 
                placeholder="Add brief details about this link..." 
                value={linkDesc}
                onChange={(e) => setLinkDesc(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Bookmark'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
