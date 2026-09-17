import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  Folder, 
  File, 
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: any) => void;
  onSelectFolder: (folderId: string) => void;
}

type FilterType = 'all' | 'pdf' | 'image' | 'video' | 'link' | 'folder';

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  onSelectFolder,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<{ folders: any[]; documents: any[] }>({ folders: [], documents: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ folders: [], documents: [] });
      return;
    }

    hapticSelection();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ folders: [], documents: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults({
            folders: data.folders || [],
            documents: data.documents || []
          });
        }
      } catch (e) {
        console.error("Search fetch failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  // Filter results by activeFilter
  const filteredFolders = activeFilter === 'all' || activeFilter === 'folder' ? results.folders : [];
  const filteredDocs = activeFilter === 'folder' 
    ? [] 
    : (activeFilter === 'all' ? results.documents : results.documents.filter(d => d.type === activeFilter));

  const totalCount = filteredFolders.length + filteredDocs.length;

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pdf', label: 'PDFs' },
    { id: 'image', label: 'Photos' },
    { id: 'video', label: 'Videos' },
    { id: 'link', label: 'Links' },
    { id: 'folder', label: 'Folders' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={18} />;
      case 'image': return <ImageIcon size={18} />;
      case 'video': return <VideoIcon size={18} />;
      case 'link': return <LinkIcon size={18} />;
      default: return <File size={18} />;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="mobile-search-overlay">
      {/* Top Header & Search Bar */}
      <div className="mobile-search-header">
        <button 
          className="mobile-search-back-btn" 
          onClick={() => {
            hapticLight();
            onClose();
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="mobile-search-input-wrap">
          <Search size={18} className="mobile-search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="mobile-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, text, folders..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button 
              className="mobile-search-clear-btn" 
              onClick={() => {
                hapticLight();
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="mobile-search-pills-bar">
        {filters.map(f => (
          <button
            key={f.id}
            className={`mobile-search-pill ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => {
              hapticLight();
              setActiveFilter(f.id);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search Results Content */}
      <div className="mobile-search-body">
        {isSearching && (
          <div className="mobile-search-loading">
            <div className="mobile-search-spinner" />
            <span>Searching vault...</span>
          </div>
        )}

        {!isSearching && !query.trim() && (
          <div className="mobile-search-empty-state">
            <div className="mobile-search-icon-bubble">
              <Sparkles size={28} />
            </div>
            <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 600 }}>Quick Vault Search</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '260px' }}>
              Type a name, extension, or text inside PDFs and documents to find it instantly.
            </p>
          </div>
        )}

        {!isSearching && query.trim() && totalCount === 0 && (
          <div className="mobile-search-empty-state">
            <div className="mobile-search-icon-bubble">
              <Search size={28} />
            </div>
            <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 600 }}>No results found</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              No matches found for "{query}" with current filter.
            </p>
          </div>
        )}

        {!isSearching && totalCount > 0 && (
          <div className="mobile-search-results-list">
            <div className="mobile-search-results-count">
              Found {totalCount} {totalCount === 1 ? 'result' : 'results'}
            </div>

            {/* Folders */}
            {filteredFolders.map(folder => (
              <div 
                key={`folder-${folder.id}`} 
                className="mobile-search-item"
                onClick={() => {
                  hapticLight();
                  onSelectFolder(folder.id);
                  onClose();
                }}
              >
                <div className="card-icon-box icon-folder" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <Folder size={18} />
                </div>
                <div className="mobile-search-item-info">
                  <div className="mobile-search-item-title">{folder.name}</div>
                  <div className="mobile-search-item-meta">Directory</div>
                </div>
                <ChevronRight size={16} className="mobile-search-item-arrow" />
              </div>
            ))}

            {/* Documents */}
            {filteredDocs.map(doc => (
              <div 
                key={`doc-${doc.id}`} 
                className="mobile-search-item"
                onClick={() => {
                  hapticLight();
                  onSelectDocument(doc);
                  onClose();
                }}
              >
                <div className={`card-icon-box icon-${doc.type || 'other'}`} style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  {getIcon(doc.type)}
                </div>
                <div className="mobile-search-item-info">
                  <div className="mobile-search-item-title">{doc.name}</div>
                  <div className="mobile-search-item-meta">
                    <span style={{ textTransform: 'uppercase' }}>{doc.type}</span>
                    {doc.size ? <> • <span>{formatBytes(doc.size)}</span></> : null}
                  </div>
                </div>
                <ChevronRight size={16} className="mobile-search-item-arrow" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
