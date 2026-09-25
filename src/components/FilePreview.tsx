import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  Download, 
  Edit2, 
  Check, 
  Copy, 
  Loader2, 
  Globe, 
  RotateCw, 
  Layout, 
  Eye, 
  Lock,
  Music,
  FileText,
  FileSpreadsheet,
  Code,
  Search
} from 'lucide-react';
import { marked } from 'marked';
import { renderAsync } from 'docx-preview';
import { read, utils } from 'xlsx';
import { API_BASE_URL } from '../config';
import { downloadDocument } from '../utils/download';
import { hapticLight } from '../utils/haptics';
import { getFileCategory } from '../utils/fileType';

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

  // Text & Markdown States
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [mdViewMode, setMdViewMode] = useState<'rendered' | 'raw'>('rendered');

  // Web Link States
  const [linkViewMode, setLinkViewMode] = useState<'iframe' | 'card'>('iframe');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isUrlCopied, setIsUrlCopied] = useState(false);

  // DOCX States
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [isDocxLoading, setIsDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  // Spreadsheet (XLSX & CSV) States
  const [sheetData, setSheetData] = useState<{ [sheetName: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetSearch, setSheetSearch] = useState('');

  const formatBytes = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const cat = getFileCategory(doc.name, doc.mime_type, doc.type);
  const isAudio = cat === 'audio';
  const isDocx = cat === 'word' && (/\.docx$/i.test(doc.name || '') || (doc.mime_type && doc.mime_type.includes('wordprocessingml')));
  const isSpreadsheet = cat === 'excel';
  const isMarkdown = cat === 'markdown';
  const isTextOrCode = (cat === 'code' || cat === 'markdown' || (
    !isSpreadsheet && (
      (doc.mime_type && doc.mime_type.startsWith('text/')) || 
      (doc.name && /\.(txt|json|xml|js|ts|jsx|tsx|css|html|py|sh|sql|yml|yaml|md)$/i.test(doc.name))
    )
  ));

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const getMediaUrl = () => {
    if (doc.type === 'link') return doc.url;
    return `${API_BASE_URL}/api/documents/${doc.id}/download`;
  };

  const handleDownloadClick = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await downloadDocument(getMediaUrl(), doc.name);
    setIsDownloading(false);
  };

  // Text/Markdown Fetch Effect
  useEffect(() => {
    if (isTextOrCode) {
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
  }, [doc.id, isTextOrCode]);

  // DOCX Rendering Effect
  useEffect(() => {
    if (isDocx && docxContainerRef.current) {
      setIsDocxLoading(true);
      setDocxError(null);
      fetch(getMediaUrl())
        .then(res => {
          if (!res.ok) throw new Error("Failed to load document data");
          return res.arrayBuffer();
        })
        .then(async (buffer) => {
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            await renderAsync(buffer, docxContainerRef.current, undefined, {
              className: 'docx-preview-node',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true
            });
          }
          setIsDocxLoading(false);
        })
        .catch(err => {
          console.error("DOCX rendering error:", err);
          setDocxError(err.message || "Failed to render document preview");
          setIsDocxLoading(false);
        });
    }
  }, [doc.id, isDocx]);

  // Spreadsheet (XLSX & CSV) Parsing Effect
  useEffect(() => {
    if (isSpreadsheet) {
      setIsSheetLoading(true);
      setSheetError(null);
      fetch(getMediaUrl())
        .then(res => {
          if (!res.ok) throw new Error("Failed to load spreadsheet data");
          return res.arrayBuffer();
        })
        .then(buffer => {
          const wb = read(buffer, { type: 'array' });
          const sheets: { [sheetName: string]: any[][] } = {};
          wb.SheetNames.forEach(name => {
            const rawRows = utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, defval: '' });
            sheets[name] = rawRows;
          });
          setSheetNames(wb.SheetNames);
          setActiveSheet(wb.SheetNames[0] || 'Sheet1');
          setSheetData(sheets);
          setIsSheetLoading(false);
        })
        .catch(err => {
          console.error("Spreadsheet error:", err);
          setSheetError(err.message || "Failed to parse spreadsheet");
          setIsSheetLoading(false);
        });
    }
  }, [doc.id, isSpreadsheet]);

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

  // Render media viewer depending on document type
  const renderViewer = () => {
    // 1. Audio (MP3, WAV, etc.)
    if (isAudio) {
      const ext = doc.name.split('.').pop()?.toUpperCase() || 'AUDIO';
      return (
        <div className="preview-audio-container">
          <div className="preview-audio-card">
            <div className="preview-audio-icon-box">
              <Music size={44} />
            </div>
            <div className="preview-audio-badge-row">
              <span className="audio-format-pill">{ext} AUDIO</span>
              <span className="audio-security-pill">Encrypted at rest</span>
            </div>
            <h3 className="preview-audio-filename" title={doc.name}>{doc.name}</h3>
            <span className="preview-audio-size">{formatBytes(doc.size)}</span>

            <div className="preview-audio-player-wrapper">
              <audio 
                controls 
                controlsList="nodownload"
                className="preview-audio-native" 
                src={getMediaUrl()} 
              />
            </div>

            <div className="preview-audio-action-row">
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={() => window.open(getMediaUrl(), '_blank')}
                title="Open audio in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in Tab</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download Audio"
              >
                {isDownloading ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. Word DOCX Documents
    if (isDocx) {
      return (
        <div className="preview-docx-container">
          <div className="preview-toolbar" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', margin: 0, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="docx-badge">Word Document</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {formatBytes(doc.size)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={() => window.open(getMediaUrl(), '_blank')}
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in Tab</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download Word Document"
              >
                {isDownloading ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
          </div>

          {isDocxLoading && (
            <div className="preview-docx-loading">
              <Loader2 size={26} className="spin-icon" />
              <span>Decrypting & rendering Word document...</span>
            </div>
          )}

          {docxError && (
            <div className="preview-docx-error">
              <p>Could not preview document formatting: {docxError}</p>
              <button 
                type="button" 
                onClick={handleDownloadClick} 
                className="btn btn-primary"
                style={{ marginTop: '12px' }}
              >
                Download Word Document
              </button>
            </div>
          )}

          <div 
            className="preview-docx-scroll-wrapper"
            style={{ display: isDocxLoading || docxError ? 'none' : 'flex' }}
          >
            <div ref={docxContainerRef} className="preview-docx-target" />
          </div>
        </div>
      );
    }

    // 3. Spreadsheets (XLSX, XLS, CSV)
    if (isSpreadsheet) {
      const activeRows = sheetData[activeSheet] || [];
      const filteredRows = sheetSearch.trim() === ''
        ? activeRows
        : activeRows.filter(row => 
            row.some(cell => String(cell).toLowerCase().includes(sheetSearch.toLowerCase()))
          );

      const isCsvFile = doc.name.toLowerCase().endsWith('.csv');
      const maxRenderRows = 300;
      const displayRows = filteredRows.slice(0, maxRenderRows);

      return (
        <div className="preview-spreadsheet-container">
          <div className="preview-spreadsheet-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="excel-badge">{isCsvFile ? 'CSV Data' : 'Excel Sheet'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {activeRows.length} rows • {activeRows[0]?.length || 0} cols
              </span>
              <div className="preview-sheet-search">
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Filter cells..." 
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={() => window.open(getMediaUrl(), '_blank')}
                title="Open raw file in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in Tab</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download Spreadsheet"
              >
                {isDownloading ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
          </div>

          {sheetNames.length > 1 && (
            <div className="preview-sheet-tabs">
              {sheetNames.map(name => (
                <button
                  key={name}
                  type="button"
                  className={`preview-sheet-tab-btn ${activeSheet === name ? 'active' : ''}`}
                  onClick={() => {
                    hapticLight();
                    setActiveSheet(name);
                  }}
                >
                  <FileSpreadsheet size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {name}
                </button>
              ))}
            </div>
          )}

          {isSheetLoading && (
            <div className="preview-docx-loading">
              <Loader2 size={26} className="spin-icon" />
              <span>Parsing spreadsheet data...</span>
            </div>
          )}

          {sheetError && (
            <div className="preview-docx-error">
              <p>Could not parse spreadsheet: {sheetError}</p>
              <button 
                type="button" 
                onClick={handleDownloadClick} 
                className="btn btn-primary"
                style={{ marginTop: '12px' }}
              >
                Download Spreadsheet
              </button>
            </div>
          )}

          {!isSheetLoading && !sheetError && (
            <div className="preview-table-wrapper">
              {displayRows.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {sheetSearch ? 'No matching rows found.' : 'Empty sheet.'}
                </div>
              ) : (
                <>
                  <table className="preview-spreadsheet-table">
                    <thead>
                      <tr>
                        <th className="row-num">#</th>
                        {displayRows[0].map((_, colIdx) => (
                          <th key={colIdx}>
                            {String.fromCharCode(65 + (colIdx % 26))}{colIdx >= 26 ? Math.floor(colIdx / 26) : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="row-num">{rIdx + 1}</td>
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} title={String(cell)}>
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length > maxRenderRows && (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                      Showing first {maxRenderRows} of {filteredRows.length} rows • Download file to view complete dataset
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    // 4. Markdown & Plain Text / Code
    if (isTextOrCode) {
      if (isLoadingText) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="spin-icon" style={{ marginRight: '8px' }} />
            Loading text preview...
          </div>
        );
      }

      return (
        <div className="preview-text-container">
          <div className="preview-toolbar" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', margin: 0, justifyContent: 'space-between' }}>
            {isMarkdown ? (
              <div className="preview-view-toggle">
                <button 
                  type="button"
                  className={`preview-toggle-btn ${mdViewMode === 'rendered' ? 'active' : ''}`}
                  onClick={() => {
                    hapticLight();
                    setMdViewMode('rendered');
                  }}
                  title="Formatted Markdown"
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </button>
                <button 
                  type="button"
                  className={`preview-toggle-btn ${mdViewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => {
                    hapticLight();
                    setMdViewMode('raw');
                  }}
                  title="Raw Markdown Source"
                >
                  <Code size={13} />
                  <span>Source</span>
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {doc.name.split('.').pop()?.toUpperCase() || 'TEXT'} Source
              </span>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="preview-toolbar-btn"
                onClick={() => {
                  if (textContent) {
                    navigator.clipboard.writeText(textContent);
                    setIsTextCopied(true);
                    setTimeout(() => setIsTextCopied(false), 2000);
                  }
                }}
                title="Copy content"
              >
                {isTextCopied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                <span>{isTextCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={() => window.open(getMediaUrl(), '_blank')}
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in Tab</span>
              </button>
              <button 
                type="button" 
                className="preview-toolbar-btn" 
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download text file"
              >
                {isDownloading ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
          </div>

          {isMarkdown && mdViewMode === 'rendered' ? (
            <div 
              className="markdown-rendered-view"
              dangerouslySetInnerHTML={{ 
                __html: marked.parse(textContent || '', { gfm: true, breaks: true }) as string 
              }}
            />
          ) : (
            <div className="markdown-raw-view">
              {textContent || 'Empty document'}
            </div>
          )}
        </div>
      );
    }

    // 5. Standard Media Types
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
      case 'link': {
        const normalizedUrl = doc.url?.startsWith('http://') || doc.url?.startsWith('https://')
          ? doc.url
          : `https://${doc.url}`;

        let hostname = doc.name;
        try {
          hostname = new URL(normalizedUrl).hostname.replace(/^www\./, '');
        } catch {
          hostname = doc.name;
        }

        return (
          <div className="preview-link-container">
            {/* Top Browser Bar */}
            <div className="preview-browser-bar">
              <div className="preview-browser-url-pill" title={normalizedUrl}>
                <Lock size={12} className="preview-browser-lock" />
                <span className="preview-browser-hostname">{hostname}</span>
                <span className="preview-browser-fullurl">{normalizedUrl}</span>
              </div>

              <div className="preview-browser-actions">
                <div className="preview-view-toggle">
                  <button 
                    type="button"
                    className={`preview-toggle-btn ${linkViewMode === 'iframe' ? 'active' : ''}`}
                    onClick={() => {
                      hapticLight();
                      setLinkViewMode('iframe');
                    }}
                    title="Live Embedded Page"
                  >
                    <Eye size={13} />
                    <span>Live Page</span>
                  </button>
                  <button 
                    type="button"
                    className={`preview-toggle-btn ${linkViewMode === 'card' ? 'active' : ''}`}
                    onClick={() => {
                      hapticLight();
                      setLinkViewMode('card');
                    }}
                    title="Landing Overview Card"
                  >
                    <Layout size={13} />
                    <span>Card</span>
                  </button>
                </div>

                {linkViewMode === 'iframe' && (
                  <button 
                    type="button"
                    className="preview-toolbar-btn"
                    onClick={() => {
                      hapticLight();
                      setIsIframeLoading(true);
                      setIframeKey(k => k + 1);
                    }}
                    title="Reload page"
                  >
                    <RotateCw size={13} />
                  </button>
                )}

                <button 
                  type="button"
                  className="preview-toolbar-btn"
                  onClick={() => {
                    hapticLight();
                    navigator.clipboard.writeText(normalizedUrl);
                    setIsUrlCopied(true);
                    setTimeout(() => setIsUrlCopied(false), 2000);
                  }}
                  title="Copy web link"
                >
                  {isUrlCopied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                  <span>{isUrlCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <a 
                  href={normalizedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="preview-toolbar-btn"
                  title="Open live website in new tab"
                >
                  <ExternalLink size={13} />
                  <span>Open in Tab</span>
                </a>
              </div>
            </div>

            {/* Content Area */}
            {linkViewMode === 'iframe' ? (
              <div className="preview-iframe-wrapper">
                {isIframeLoading && (
                  <div className="preview-iframe-loading">
                    <Loader2 size={24} className="spin-icon" />
                    <span>Loading live webpage...</span>
                  </div>
                )}
                <iframe 
                  key={iframeKey}
                  className="preview-browser-frame"
                  src={normalizedUrl}
                  title={doc.name}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  onLoad={() => setIsIframeLoading(false)}
                />
                <div className="preview-iframe-footer-hint">
                  <span>If site restricts live embedding, click <strong>Open in Tab ↗</strong> above.</span>
                </div>
              </div>
            ) : (
              <div className="preview-link-card-view">
                {doc.thumbnail_url && (
                  <div className="preview-link-hero-wrap">
                    <img 
                      className="preview-link-hero-img" 
                      src={doc.thumbnail_url} 
                      alt={doc.name} 
                    />
                  </div>
                )}
                <div className="preview-link-content">
                  <div className="preview-link-domain-badge">
                    <Globe size={14} />
                    <span>{hostname}</span>
                  </div>
                  <h3 className="preview-link-title">{doc.name}</h3>
                  {doc.description && (
                    <p className="preview-link-desc">{doc.description}</p>
                  )}
                  <p className="preview-link-url">{normalizedUrl}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a 
                      href={normalizedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary" 
                      style={{ padding: '8px 18px', fontSize: '14px', gap: '8px' }}
                      onClick={() => hapticLight()}
                    >
                      <ExternalLink size={15} />
                      Visit Website
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
                      onClick={() => {
                        hapticLight();
                        setLinkViewMode('iframe');
                      }}
                    >
                      <Eye size={14} />
                      View Live Frame
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }
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
      <div 
        className={`modal-content preview-modal-content ${doc.type === 'link' ? 'preview-modal-link' : ''} ${isDocx || isSpreadsheet ? 'preview-modal-expanded' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
            <h3 className="modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.name}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Type: {(cat || doc.type || 'FILE').toUpperCase()} • Created on {new Date(doc.created_at).toLocaleDateString()}
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
