import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FolderPlus, 
  Link2, 
  Trash2, 
  Plus, 
  Loader2,
  FileEdit,
  Bold,
  Italic,
  Heading,
  List,
  CheckSquare,
  Code as CodeIcon,
  Quote,
  Clipboard,
  Eye
} from 'lucide-react';
import { marked } from 'marked';
import { API_BASE_URL } from '../config';
import { FolderWaveSelector } from './FolderWaveSelector';
import { renderFileIcon, getFileIconClass } from '../utils/fileType';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface UploadModalProps {
  initialTab: 'file' | 'folder' | 'link' | 'note';
  onClose: () => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onSaveLink: (url: string, description: string, parentId?: string | null) => Promise<void>;
  onUploadFiles: (files: FileList | File[], parentId?: string | null) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'file' | 'folder' | 'link' | 'note'>(initialTab);
  
  // Folder inputs
  const [folderName, setFolderName] = useState('');
  
  // Link inputs
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');

  // Markdown Note inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteMode, setNoteMode] = useState<'write' | 'preview'>('write');
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Destination Folder Selector States
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || '');

  // Staged files for editing names before upload
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedNames, setStagedNames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const addFilesToStage = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    setStagedFiles(prev => [...prev, ...list]);
    setStagedNames(prev => [...prev, ...list.map(f => f.name)]);
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
    setStagedNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadStaged = async () => {
    if (stagedFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      // Build renamed files with custom user-provided names
      const filesToUpload = stagedFiles.map((file, idx) => {
        const customName = (stagedNames[idx] || '').trim();
        if (!customName || customName === file.name) return file;
        const dotIdx = file.name.lastIndexOf('.');
        const ext = dotIdx !== -1 ? file.name.slice(dotIdx) : '';
        const finalName = customName.includes('.') ? customName : `${customName}${ext}`;
        try {
          return new (window as any).File([file], finalName, { type: file.type });
        } catch {
          return file;
        }
      });
      await onUploadFiles(filesToUpload, selectedFolderId || null);
      setStagedFiles([]);
      setStagedNames([]);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch flat folders on modal load
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

  // Note Formatting Helpers
  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    hapticLight();
    const textarea = noteTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setNoteContent(newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  const handlePasteClipboardToNote = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        hapticSuccess();
        insertMarkdown(text);
      }
    } catch (_) {
      // Browser permissions or clipboard empty
    }
  };

  // Markdown Note Submit
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && !noteTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const rawTitle = (noteTitle || 'Untitled Note').trim();
      const finalName = rawTitle.toLowerCase().endsWith('.md') ? rawTitle : `${rawTitle}.md`;
      const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8' });
      const file = new (window as any).File([blob], finalName, { type: 'text/markdown' });
      await onUploadFiles([file], selectedFolderId || null);
      setNoteTitle('');
      setNoteContent('');
      onClose();
    } catch (err) {
      console.error("Error saving note:", err);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStage(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToStage(e.target.files);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${activeTab === 'note' ? 'upload-modal-note' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title">Add Content</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            type="button"
            className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            <Upload size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Upload Files
          </button>
          <button 
            type="button"
            className={`modal-tab ${activeTab === 'note' ? 'active' : ''}`}
            onClick={() => setActiveTab('note')}
          >
            <FileEdit size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
            New Note
          </button>
          <button 
            type="button"
            className={`modal-tab ${activeTab === 'folder' ? 'active' : ''}`}
            onClick={() => setActiveTab('folder')}
          >
            <FolderPlus size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Create Folder
          </button>
          <button 
            type="button"
            className={`modal-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link2 size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Save Link
          </button>
        </div>

        {/* Destination Folder Selector with Multiple Waves */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Destination Folder
          </label>
          <FolderWaveSelector
            folders={allFolders}
            selectedFolderId={selectedFolderId}
            onChange={(folderId) => setSelectedFolderId(folderId)}
            disabled={isSubmitting}
          />
        </div>

        {/* Tab 1: Upload Files */}
        {activeTab === 'file' && (
          <div
            onPaste={async (e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              const pastedFiles: File[] = [];
              for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file') {
                  const f = items[i].getAsFile();
                  if (f) {
                    pastedFiles.push(f);
                  }
                }
              }
              if (pastedFiles.length > 0) {
                e.preventDefault();
                addFilesToStage(pastedFiles);
              }
            }}
            tabIndex={0}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              onChange={handleFileChange}
            />

            {stagedFiles.length === 0 ? (
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
                  Drag & drop files here, or click to browse
                </p>
                <span className="dropzone-subtext">
                  Supports PDFs, Photos, Videos & Documents up to 1 GB
                </span>
                <span className="dropzone-subtext" style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
                  💡 Tip: You can also paste images with ⌘V / Ctrl+V
                </span>
              </div>
            ) : (
              <div>
                <div style={{ 
                  maxHeight: '220px', 
                  overflowY: 'auto',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}>
                  {stagedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`card-icon-box ${getFileIconClass(file.name, file.type)}`} style={{ width: '38px', height: '38px', flexShrink: 0 }}>
                        {renderFileIcon(file.name, file.type, '', 20)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          type="text"
                          className="form-input"
                          value={stagedNames[idx] !== undefined ? stagedNames[idx] : file.name}
                          onChange={(e) => {
                            const updated = [...stagedNames];
                            updated[idx] = e.target.value;
                            setStagedNames(updated);
                          }}
                          placeholder="File name"
                          style={{
                            padding: '6px 10px',
                            fontSize: '13px',
                            width: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatBytes(file.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStagedFile(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ gap: '6px', fontSize: '13px' }}
                  >
                    <Plus size={16} />
                    Add More
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setStagedFiles([]);
                        setStagedNames([]);
                      }}
                      disabled={isSubmitting}
                    >
                      Clear
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleUploadStaged}
                      disabled={isSubmitting}
                      style={{ gap: '8px' }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="spin-icon" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>Upload {stagedFiles.length} {stagedFiles.length === 1 ? 'Item' : 'Items'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: New Note (Markdown) */}
        {activeTab === 'note' && (
          <form onSubmit={handleNoteSubmit} className="note-create-form">
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Note Title</span>
                <span className="docx-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontSize: '10px' }}>
                  MARKDOWN (.md)
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Project Ideas, Meeting Notes" 
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>.md</span>
              </div>
            </div>

            {/* Markdown Toolbar & Mode Switcher */}
            <div className="note-toolbar">
              <div className="note-formatting-actions">
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('**', '**', 'bold text')}
                  title="Bold (**text**)"
                >
                  <Bold size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('*', '*', 'italic text')}
                  title="Italic (*text*)"
                >
                  <Italic size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('### ', '', 'Heading')}
                  title="Heading (### Heading)"
                >
                  <Heading size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('- ', '', 'List item')}
                  title="Bullet List (- item)"
                >
                  <List size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('- [ ] ', '', 'Task')}
                  title="Task Checkbox (- [ ] task)"
                >
                  <CheckSquare size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('`', '`', 'code')}
                  title="Inline Code (`code`)"
                >
                  <CodeIcon size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={() => insertMarkdown('> ', '', 'Quote')}
                  title="Quote (> quote)"
                >
                  <Quote size={13} />
                </button>
                <button 
                  type="button" 
                  className="note-tool-btn" 
                  onClick={handlePasteClipboardToNote}
                  title="Paste from Clipboard"
                >
                  <Clipboard size={13} />
                  <span>Paste</span>
                </button>
              </div>

              <div className="preview-view-toggle">
                <button 
                  type="button"
                  className={`preview-toggle-btn ${noteMode === 'write' ? 'active' : ''}`}
                  onClick={() => {
                    hapticLight();
                    setNoteMode('write');
                  }}
                  title="Write mode"
                >
                  <CodeIcon size={12} />
                  <span>Write</span>
                </button>
                <button 
                  type="button"
                  className={`preview-toggle-btn ${noteMode === 'preview' ? 'active' : ''}`}
                  onClick={() => {
                    hapticLight();
                    setNoteMode('preview');
                  }}
                  title="Live Preview"
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Note Content Area */}
            {noteMode === 'write' ? (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <textarea
                  ref={noteTextareaRef}
                  className="form-textarea note-textarea"
                  placeholder="# My Note&#10;Write or paste your markdown note here...&#10;&#10;- Supports **bold**, *italics*, and lists&#10;- Switch to Preview above to see formatted result"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  disabled={isSubmitting}
                  rows={8}
                />
              </div>
            ) : (
              <div 
                className="markdown-rendered-view note-preview-box"
                dangerouslySetInnerHTML={{ 
                  __html: marked.parse(noteContent || '*No content written yet. Switch to Write to start typing or paste text.*', { gfm: true, breaks: true }) as string 
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {noteContent.trim() ? `${noteContent.trim().split(/\s+/).length} words • ${noteContent.length} chars` : '0 words'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting || (!noteContent.trim() && !noteTitle.trim())}
                  style={{ gap: '6px' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Create Folder */}
        {activeTab === 'folder' && (
          <form onSubmit={handleFolderSubmit}>
            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Work, Financials, Personal" 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                disabled={isSubmitting}
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

        {/* Tab 4: Save Link */}
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
