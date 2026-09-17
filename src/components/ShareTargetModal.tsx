 import React, { useState, useEffect } from 'react';
import { X, Folder, UploadCloud, Link as LinkIcon, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface ShareTargetModalProps {
  isOpen: boolean;
  sharedFiles: File[];
  sharedLink?: { url: string; title?: string } | null;
  onClose: () => void;
  onConfirmUpload: (files: File[], targetFolderId: string | null) => Promise<void>;
  onConfirmSaveLink: (url: string, description: string, targetFolderId: string | null) => Promise<void>;
  initialFolderId: string | null;
}

export const ShareTargetModal: React.FC<ShareTargetModalProps> = ({
  isOpen,
  sharedFiles,
  sharedLink,
  onClose,
  onConfirmUpload,
  onConfirmSaveLink,
  initialFolderId,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId || '');
  const [allFolders, setAllFolders] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Fetch available vault folders
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API_BASE_URL}/api/all-folders`)
      .then(res => res.json())
      .then(data => setAllFolders(data || []))
      .catch(err => console.error("Error fetching folders for share destination:", err));

    // Generate object URLs for image previews
    const urls: string[] = [];
    sharedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        urls.push(URL.createObjectURL(file));
      }
    });
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [isOpen, sharedFiles]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    hapticLight();

    try {
      if (sharedFiles.length > 0) {
        await onConfirmUpload(sharedFiles, selectedFolderId || null);
      } else if (sharedLink?.url) {
        await onConfirmSaveLink(sharedLink.url, sharedLink.title || '', selectedFolderId || null);
      }
      hapticSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save shared items:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px', width: '92vw' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              className="card-icon-box" 
              style={{ width: '38px', height: '38px', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 600 }}>
                {sharedFiles.length > 0 
                  ? (sharedFiles.length === 1 ? 'Save Shared Photo' : `Save ${sharedFiles.length} Shared Items`)
                  : 'Save Shared Link'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Choose where to store this in your vault
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Cancel">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Preview of incoming item(s) */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: 'var(--border-radius-sm)', 
            padding: '12px',
            marginBottom: '16px',
            border: '1px solid var(--border-color)',
            maxHeight: '160px',
            overflowY: 'auto'
          }}>
            {sharedFiles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sharedFiles.map((file, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {previewUrls[idx] ? (
                      <img 
                        src={previewUrls[idx]} 
                        alt="Preview" 
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    ) : (
                      <div className="card-icon-box" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                        {file.type.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatBytes(file.size)} • {file.type || 'photo'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sharedLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="card-icon-box icon-link" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <LinkIcon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sharedLink.title || 'Shared Link'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sharedLink.url}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Destination Folder Dropdown Selector */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={14} />
              <span>Destination Folder</span>
            </label>
            <select
              className="form-input"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--border-radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              <option value="">🏠 Main Vault (Root)</option>
              {allFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  📁 {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save to Vault</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
