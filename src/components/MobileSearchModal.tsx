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
  Sparkles,
  Layers
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface MobileSearchModalProps {
  isOpen: boolean;
  isPaused?: boolean;
  onClose: () => void;
  onSelectDocument: (doc: any) => void;
  onSelectFolder: (folderId: string) => void;
}

type FilterType = 'all' | 'pdf' | 'image' | 'video' | 'link' | 'folder';

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  isPaused = false,
  onClose,
  onSelectDocument,
  onSelectFolder,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [vaultItems, setVaultItems] = useState<{ folders: any[]; documents: any[] }>({ folders: [], documents: [] });
  const [results, setResults] = useState<{ folders: any[]; documents: any[] }>({ folders: [], documents: [] });
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevOpenRef = useRef(false);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissKeyboard = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // Load all items when opening modal
  useEffect(() => {
    if (!isOpen) {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      setQuery('');
      setActiveFilter('all');
      prevOpenRef.current = false;
      return;
    }

    // Only focus the search input on the INITIAL opening of search, and ONLY if not paused
    if (!prevOpenRef.current && !isPaused) {
      prevOpenRef.current = true;
      hapticSelection();
      focusTimeoutRef.current = setTimeout(() => {
        if (!isPaused && inputRef.current) {
          inputRef.current.focus();
        }
      }, 80);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Fetch all vault items to make pills/badges work instantly
    const loadVaultData = async () => {
      setIsLoadingVault(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/search`);
        if (res.ok) {
          const data = await res.json();
          const items = {
            folders: data.folders || [],
            documents: data.documents || []
          };
          setVaultItems(items);
          setResults(items);
        }
      } catch (e) {
        console.error("Failed to load initial vault items for search:", e);
      } finally {
        setIsLoadingVault(false);
      }
    };

    loadVaultData();

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // When paused (e.g. preview opened over search), immediately cancel any pending focus and blur input
  useEffect(() => {
    if (isPaused) {
      dismissKeyboard();
    }
  }, [isPaused]);

  // Handle debounced search query
  useEffect(() => {
    if (!query.trim()) {
      // If query is empty, instantly restore full vault items
      setResults(vaultItems);
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
    }, 200);

    return () => clearTimeout(timer);
  }, [query, vaultItems]);

  if (!isOpen) return null;

  // Dynamic counts based on current active results
  const counts = {
    all: (results.folders || []).length + (results.documents || []).length,
    pdf: (results.documents || []).filter(d => d.type === 'pdf').length,
    image: (results.documents || []).filter(d => d.type === 'image').length,
    video: (results.documents || []).filter(d => d.type === 'video').length,
    link: (results.documents || []).filter(d => d.type === 'link').length,
    folder: (results.folders || []).length,
  };

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'pdf', label: 'PDFs', count: counts.pdf },
    { id: 'image', label: 'Photos', count: counts.image },
    { id: 'video', label: 'Videos', count: counts.video },
    { id: 'link', label: 'Links', count: counts.link },
    { id: 'folder', label: 'Folders', count: counts.folder },
  ];

  // Filter results by active badge
  const filteredFolders = (activeFilter === 'all' || activeFilter === 'folder') ? (results.folders || []) : [];
  const filteredDocs = activeFilter === 'folder' 
    ? [] 
    : (activeFilter === 'all' 
        ? (results.documents || []) 
        : (results.documents || []).filter(d => d.type === activeFilter));

  const totalCount = filteredFolders.length + filteredDocs.length;

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

  const getActiveFilterLabel = () => {
    const f = filters.find(item => item.id === activeFilter);
    return f ? f.label : 'Items';
  };

  return (
    <div 
      className="mobile-search-overlay"
      style={isPaused ? { display: 'none' } : undefined}
      aria-hidden={isPaused}
    >
      {/* Top Header & Search Bar */}
      <div className="mobile-search-header">
        <button 
          className="mobile-search-back-btn" 
          onClick={() => {
            dismissKeyboard();
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
            placeholder="Search files, text, folders..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isPaused}
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

      {/* Quick Filter Pills with Dynamic Counts */}
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
            <span>{f.label}</span>
            <span className="mobile-search-pill-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search Results Content */}
      <div 
        className="mobile-search-body"
        onScroll={() => {
          if (document.activeElement === inputRef.current) {
            inputRef.current?.blur();
          }
        }}
        onTouchMove={() => {
          if (document.activeElement === inputRef.current) {
            inputRef.current?.blur();
          }
        }}
      >
        {(isLoadingVault && !results.folders.length && !results.documents.length) ? (
          <div className="mobile-search-loading">
            <div className="mobile-search-spinner" />
            <span>Loading vault items...</span>
          </div>
        ) : isSearching ? (
          <div className="mobile-search-loading">
            <div className="mobile-search-spinner" />
            <span>Searching vault...</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="mobile-search-empty-state">
            <div className="mobile-search-icon-bubble">
              {query.trim() ? <Search size={28} /> : <Layers size={28} />}
            </div>
            <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 600 }}>
              {query.trim() ? 'No results found' : `No ${getActiveFilterLabel()} found`}
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '280px', margin: '0 auto 16px' }}>
              {query.trim() 
                ? `No matches for "${query}" in ${activeFilter === 'all' ? 'the vault' : getActiveFilterLabel().toLowerCase()}.` 
                : `There are currently no ${getActiveFilterLabel().toLowerCase()} in your vault.`}
            </p>
            {query.trim() && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '20px' }}
                onClick={() => {
                  hapticLight();
                  setQuery('');
                  setActiveFilter('all');
                  inputRef.current?.focus();
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="mobile-search-results-list">
            <div className="mobile-search-results-count">
              {query.trim() 
                ? `Found ${totalCount} ${totalCount === 1 ? 'result' : 'results'} for "${query}"` 
                : `${getActiveFilterLabel()} (${totalCount})`}
            </div>

            {/* Folders */}
            {filteredFolders.map(folder => (
              <div 
                key={`folder-${folder.id}`} 
                className="mobile-search-item"
                onTouchStart={dismissKeyboard}
                onMouseDown={dismissKeyboard}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissKeyboard();
                  hapticLight();
                  onSelectFolder(folder.id);
                }}
              >
                <div className="card-icon-box icon-folder" style={{ width: '38px', height: '38px', flexShrink: 0 }}>
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
                onTouchStart={dismissKeyboard}
                onMouseDown={dismissKeyboard}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissKeyboard();
                  hapticLight();
                  onSelectDocument(doc);
                }}
              >
                <div className={`card-icon-box icon-${doc.type || 'other'}`} style={{ width: '38px', height: '38px', flexShrink: 0 }}>
                  {getIcon(doc.type)}
                </div>
                <div className="mobile-search-item-info">
                  <div className="mobile-search-item-title">{doc.name}</div>
                  <div className="mobile-search-item-meta">
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{doc.type}</span>
                    {doc.size ? <> • <span>{formatBytes(doc.size)}</span></> : null}
                    {doc.description && !doc.match_snippet ? <> • <span>{doc.description}</span></> : null}
                  </div>
                  {doc.match_snippet && (
                    <div className="mobile-search-item-snippet" title={doc.match_snippet}>
                      <Sparkles size={11} style={{ marginRight: '5px', flexShrink: 0 }} />
                      <span>Matched in text: "{doc.match_snippet}"</span>
                    </div>
                  )}
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
