import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sun, Moon, Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FolderView } from './components/FolderView';
import { FilePreview } from './components/FilePreview';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { Toast, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { RenameModal } from './components/RenameModal';
import { MobileSearchModal } from './components/MobileSearchModal';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MobileActionSheet } from './components/MobileActionSheet';
import { MobileItemSheet } from './components/MobileItemSheet';
import { ShareTargetModal } from './components/ShareTargetModal';
import { downloadDocument } from './utils/download';
import { hapticLight, hapticSuccess, hapticWarning } from './utils/haptics';
import { usePWA } from './hooks/usePWA';
import { API_BASE_URL } from './config';
import { saveLocalVault, getLocalVault, saveLocalStats, getLocalStats } from './utils/localDb';

export default function App() {
  const { isOnline, canInstall, triggerInstall } = usePWA();
  
  // Login auth verification
  const checkAuth = (): boolean => {
    const expires = localStorage.getItem('keepspace_expires');
    if (!expires) return false;
    const expiryTime = parseInt(expires, 10);
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      localStorage.removeItem('keepspace_expires');
      return false;
    }
    return true;
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(checkAuth());

  const handleUnlock = (password: string): boolean => {
    if (password === 'ironmansucks') {
      const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
      localStorage.setItem('keepspace_expires', expiry.toString());
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('keepspace_expires');
    setIsAuthenticated(false);
  };

  // Sidebar state for mobile layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Theme state persisted in localStorage
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('keepspace_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Tab and Folder navigation state
  const [currentTab, setCurrentTab] = useState<string>('all'); // all, favorites, pdf, image, video, link
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Navigation helpers with History pushState for PWA swipe-back support
  const handleNavigateFolder = (folderId: string | null) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    searchInputRef.current?.blur();
    setMobileSearchOpen(false);
    const targetHash = folderId ? `#folder=${folderId}` : '#';
    if (window.location.hash !== targetHash) {
      window.history.pushState({ folderId, tab: 'all' }, '', targetHash || window.location.pathname);
    }
    setFolders([]);
    setDocuments([]);
    setIsLoading(true);
    setCurrentFolderId(folderId);
    setCurrentTab('all');
  };

  const handleSelectTab = (tab: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    searchInputRef.current?.blur();
    setMobileSearchOpen(false);
    const targetHash = tab !== 'all' ? `#tab=${tab}` : '#';
    if (window.location.hash !== targetHash) {
      window.history.pushState({ folderId: null, tab }, '', targetHash || window.location.pathname);
    }
    setFolders([]);
    setDocuments([]);
    setIsLoading(true);
    setCurrentFolderId(null);
    setCurrentTab(tab);
  };

  const handleOpenSearch = () => {
    setMobileSearchOpen(true);
    if (!window.location.hash.includes('search')) {
      window.history.pushState({ modal: 'search' }, '', '#search');
    }
  };

  const handleCloseSearch = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMobileSearchOpen(false);
    if (window.location.hash.includes('search')) {
      window.history.back();
    }
  };

  const handleOpenPreview = (doc: any) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    searchInputRef.current?.blur();
    setMobileSearchOpen(false);
    setPreviewDoc(doc);
    window.history.pushState({ modal: 'preview' }, '', '#preview');
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
    if (window.location.hash.includes('preview')) {
      window.history.back();
    }
  };

  const handleOpenShare = (doc: any) => {
    setShareDoc(doc);
    window.history.pushState({ modal: 'share' }, '', '#share');
  };

  const handleCloseShare = () => {
    setShareDoc(null);
    if (window.location.hash.includes('share')) {
      window.history.back();
    }
  };

  // Sync state from URL hash & handle browser Back/Forward / PWA Swipe Back
  useEffect(() => {
    const syncFromUrl = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const folderParam = params.get('folder');
      const tabParam = params.get('tab');
      const isSearch = hash === 'search';
      const isPreview = hash === 'preview';
      const isShare = hash === 'share';

      // Close preview if we backed out of preview
      if (!isPreview) {
        setPreviewDoc(null);
      }

      // Close share if we backed out of share
      if (!isShare) {
        setShareDoc(null);
      }

      // If hash is #search, ensure search is visible
      if (isSearch) {
        setMobileSearchOpen(true);
      } else if (!isShare) {
        // If we backed out of search to dashboard, folder, or preview, close search
        setMobileSearchOpen(false);
      }

      // Close transient sheets & dialogs on back navigation
      setActiveUploadTab(null);
      setMobileActionSheetOpen(false);
      setMobileItemSheet(null);
      setConfirmModal(null);
      setRenameModal(null);
      setSidebarOpen(false);

      if (folderParam) {
        setCurrentFolderId(folderParam);
        setCurrentTab('all');
      } else if (tabParam) {
        setCurrentFolderId(null);
        setCurrentTab(tabParam);
      } else if (!isSearch && !isPreview && !isShare) {
        setCurrentFolderId(null);
        setCurrentTab('all');
      }
    };

    // Sync initial load URL hash
    syncFromUrl();

    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Data loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Modal / Preview Overlay States
  const [activeUploadTab, setActiveUploadTab] = useState<'file' | 'folder' | 'link' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [shareDoc, setShareDoc] = useState<any | null>(null);

  // Dialog Modals (replacing window.confirm and window.prompt)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    id: string;
    isFolder: boolean;
    currentName: string;
    onSave: (newName: string) => void;
  } | null>(null);

  // Mobile Experience States
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [mobileActionSheetOpen, setMobileActionSheetOpen] = useState<boolean>(false);
  const [mobileItemSheet, setMobileItemSheet] = useState<{
    isOpen: boolean;
    item: any;
    isFolder: boolean;
  } | null>(null);

  // Incoming OS Share Target State (allows selecting destination folder)
  const [incomingShare, setIncomingShare] = useState<{
    files: File[];
    link?: { url: string; title: string } | null;
  } | null>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const pullTouchStartRef = useRef<number>(0);
  
  // Sidebar folders state (always shows top-level root folders)
  const [sidebarFolders, setSidebarFolders] = useState<any[]>([]);
  
  // Last uploaded folder id (persisted in localStorage)
  const [lastUploadFolderId, setLastUploadFolderId] = useState<string>(() => {
    return localStorage.getItem('keepspace_last_upload_folder') || '';
  });
  
  // Custom Card display size state (sm, md, lg)
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('keepspace_card_size') as 'sm' | 'md' | 'lg') || 'md';
  });
  
  const handleSetCardSize = (size: 'sm' | 'md' | 'lg') => {
    setCardSize(size);
    localStorage.setItem('keepspace_card_size', size);
  };
  
  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('keepspace_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Helper to add toast notification
  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        await saveLocalStats(data);
      }
    } catch (e) {
      console.warn("Failed to load stats, loading from cache...", e);
      const cachedStats = await getLocalStats();
      if (cachedStats) {
        setStats(cachedStats);
      }
    }
  };

  // Main Fetch: folders, breadcrumbs, items inside current folder or tab
  const fetchData = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    const cacheKey = currentFolderId ? `folder_${currentFolderId}` : `tab_${currentTab}`;
    
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let url = `${API_BASE_URL}/api/folders`;
      if (currentFolderId) {
        url = `${API_BASE_URL}/api/folders/${currentFolderId}`;
      } else if (currentTab === 'favorites') {
        url = `${API_BASE_URL}/api/search`;
      } else if (currentTab !== 'all') {
        url = `${API_BASE_URL}/api/search?type=${currentTab}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFolderName(data.folder ? data.folder.name : null);
        setBreadcrumbs(data.breadcrumbs || []);
        
        // Filter folders/files depending on search query or tab filters
        let allSubfolders = data.subfolders || data.folders || [];
        let allDocs = data.documents || [];

        // Apply Tab filters
        if (!currentFolderId) {
          if (currentTab === 'favorites') {
            allDocs = allDocs.filter((d: any) => d.favorite === 1);
            allSubfolders = [];
          } else if (currentTab !== 'all') {
            allDocs = allDocs.filter((d: any) => d.type === currentTab);
            allSubfolders = [];
          }
        }
        
        setFolders(allSubfolders);
        setDocuments(allDocs);

        // Store fetched layout locally
        await saveLocalVault(cacheKey, {
          folder: data.folder || null,
          breadcrumbs: data.breadcrumbs || [],
          subfolders: allSubfolders,
          documents: allDocs
        });
      }
    } catch (e) {
      console.warn("API disconnect: loading cached vault layout...");
      const cached = await getLocalVault(cacheKey);
      if (cached) {
        setFolderName(cached.folder ? cached.folder.name : null);
        setBreadcrumbs(cached.breadcrumbs || []);
        setFolders(cached.subfolders || []);
        setDocuments(cached.documents || []);
        addToast("Offline mode: showing local cached vault details", "error");
      } else {
        addToast("Offline mode: no local cache available for this view", "error");
      }
    } finally {
      if (isSilent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Global Search Fetch
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchData();
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch only top-level root folders for sidebar list
  const fetchSidebarFolders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders`);
      if (res.ok) {
        const data = await res.json();
        setSidebarFolders(data.subfolders || []);
      }
    } catch (e) {
      console.error("Failed to load sidebar folders: ", e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchSidebarFolders();
  }, [currentFolderId, currentTab]);

  // Global Keyboard Shortcuts (⌘K to search, Esc to dismiss modal/search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');
        if (!isInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape') {
        if (previewDoc) handleClosePreview();
        else if (shareDoc) handleCloseShare();
        else if (mobileSearchOpen) handleCloseSearch();
        else if (activeUploadTab) setActiveUploadTab(null);
        else if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          if (searchQuery) handleSearch('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, shareDoc, activeUploadTab, searchQuery, mobileSearchOpen]);

  // Helper to record last folder path context
  const updateLastUploadFolder = (parentId: string | null) => {
    if (parentId) {
      localStorage.setItem('keepspace_last_upload_folder', parentId);
      setLastUploadFolderId(parentId);
    } else {
      localStorage.removeItem('keepspace_last_upload_folder');
      setLastUploadFolderId('');
    }
  };

  // Create Folder handler
  const handleCreateFolder = async (name: string, parentId?: string | null) => {
    const targetParent = parentId !== undefined ? parentId : currentFolderId;
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: targetParent })
      });
      if (res.ok) {
        addToast(`Directory "${name}" created successfully`);
        updateLastUploadFolder(targetParent);
        fetchData({ silent: true });
        fetchStats();
        fetchSidebarFolders();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to create folder", "error");
      }
    } catch (e) {
      addToast("Network error creating folder", "error");
    }
  };

  // Save external web link handler
  const handleSaveLink = async (url: string, description: string, parentId?: string | null) => {
    const targetParent = parentId !== undefined ? parentId : currentFolderId;
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, parent_id: targetParent, description })
      });
      if (res.ok) {
        addToast("Link metadata saved successfully");
        updateLastUploadFolder(targetParent);
        fetchData({ silent: true });
        fetchStats();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to save link", "error");
      }
    } catch (e) {
      addToast("Network error saving link", "error");
    }
  };

  // Upload local files handler
  const handleUploadFiles = async (files: FileList | File[], parentId?: string | null) => {
    let successCount = 0;
    let failCount = 0;
    
    const targetParentId = parentId !== undefined ? parentId : currentFolderId;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (targetParentId) {
        formData.append('parent_id', targetParentId);
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/documents`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) {
      hapticSuccess();
      addToast(`Successfully uploaded ${successCount} file(s)`);
      updateLastUploadFolder(targetParentId);
    }
    if (failCount > 0) {
      hapticWarning();
      addToast(`Failed to upload ${failCount} file(s)`, 'error');
    }

    fetchData({ silent: true });
    fetchStats();
  };

  // Process incoming shared payload from Web Share Target API (IndexedDB primary + CacheStorage fallback)
  const processIncomingShareTarget = useCallback(async () => {
    try {
      // 1. Try reading from IndexedDB primary store
      let idbRecord: any = null;
      if ('indexedDB' in window) {
        try {
          idbRecord = await new Promise((resolve) => {
            const req = indexedDB.open('keepspace_share_db', 1);
            req.onupgradeneeded = (e: any) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('shares')) {
                db.createObjectStore('shares', { keyPath: 'id' });
              }
            };
            req.onsuccess = (e: any) => {
              try {
                const db = e.target.result;
                const tx = db.transaction('shares', 'readwrite');
                const store = tx.objectStore('shares');
                const getReq = store.get('pending_share');
                getReq.onsuccess = () => {
                  resolve(getReq.result || null);
                };
                getReq.onerror = () => resolve(null);
              } catch (_) {
                resolve(null);
              }
            };
            req.onerror = () => resolve(null);
          });
        } catch (_) {}
      }

      if (idbRecord) {
        // Ignore stale payloads older than 15 minutes
        if (Date.now() - idbRecord.timestamp > 900000) {
          try {
            const req = indexedDB.open('keepspace_share_db', 1);
            req.onsuccess = (e: any) => {
              const db = e.target.result;
              const tx = db.transaction('shares', 'readwrite');
              tx.objectStore('shares').delete('pending_share');
            };
          } catch (_) {}
          return;
        }

        // If user is locked/unauthenticated, do not delete yet! Keep for post-unlock
        if (!isAuthenticated) {
          return;
        }

        const incomingFiles: File[] = [];
        if (idbRecord.files && Array.isArray(idbRecord.files)) {
          for (let i = 0; i < idbRecord.files.length; i++) {
            const f = idbRecord.files[i];
            const blob = f.blob instanceof Blob ? f.blob : new Blob([f.blob], { type: f.type || 'image/jpeg' });
            incomingFiles.push(new File([blob], f.name || `shared_photo_${Date.now()}.jpg`, { type: f.type || blob.type || 'image/jpeg' }));
          }
        }

        // Clear IndexedDB pending_share record
        try {
          const req = indexedDB.open('keepspace_share_db', 1);
          req.onsuccess = (e: any) => {
            const db = e.target.result;
            const tx = db.transaction('shares', 'readwrite');
            tx.objectStore('shares').delete('pending_share');
          };
        } catch (_) {}

        // Also clean cache fallback
        if ('caches' in window) {
          caches.open('keepspace-shared-payload').then((c) => {
            c.keys().then((keys) => keys.forEach((k) => c.delete(k)));
          }).catch(() => {});
        }

        if (incomingFiles.length > 0) {
          hapticSuccess();
          setIncomingShare({ files: incomingFiles, link: null });
          return;
        } else if (idbRecord.url || idbRecord.text) {
          const targetLink = idbRecord.url || idbRecord.text;
          if (targetLink && targetLink.startsWith('http')) {
            hapticSuccess();
            setIncomingShare({ files: [], link: { url: targetLink, title: idbRecord.title || '' } });
            return;
          }
        }
      }

      // 2. Secondary fallback: CacheStorage
      if (!('caches' in window)) return;
      const cache = await caches.open('keepspace-shared-payload');
      const metaRes = await cache.match('/shared-meta');
      if (!metaRes) return;

      const meta = await metaRes.json();
      // Ignore stale payloads older than 15 minutes
      if (!meta || Date.now() - meta.timestamp > 900000) {
        await cache.delete('/shared-meta');
        return;
      }

      // If user is locked/unauthenticated, keep for post-unlock
      if (!isAuthenticated) {
        return;
      }

      if (meta.count > 0) {
        const incomingFiles: File[] = [];
        for (let i = 0; i < meta.count; i++) {
          const fileRes = await cache.match(`/shared-file-${i}`);
          if (fileRes) {
            const blob = await fileRes.blob();
            const fileName = decodeURIComponent(fileRes.headers.get('x-filename') || `shared_photo_${Date.now()}.jpg`);
            const mimeType = fileRes.headers.get('content-type') || blob.type || 'image/jpeg';
            incomingFiles.push(new File([blob], fileName, { type: mimeType }));
            await cache.delete(`/shared-file-${i}`);
          }
        }
        await cache.delete('/shared-meta');

        if (incomingFiles.length > 0) {
          hapticSuccess();
          setIncomingShare({ files: incomingFiles, link: null });
        }
      } else if (meta.sharedUrl || meta.text) {
        await cache.delete('/shared-meta');
        const targetLink = meta.sharedUrl || meta.text;
        if (targetLink && targetLink.startsWith('http')) {
          hapticSuccess();
          setIncomingShare({ files: [], link: { url: targetLink, title: meta.title || '' } });
        }
      }
    } catch (err) {
      console.error("Failed to read shared target payload:", err);
    }
  }, [isAuthenticated]);

  // Check on mount, auth change, and folder navigation
  useEffect(() => {
    processIncomingShareTarget();
  }, [isAuthenticated, currentFolderId, processIncomingShareTarget]);

  // Listen to Window Focus and Visibility Change (app brought from background to foreground on Share)
  useEffect(() => {
    const handleFocus = () => {
      processIncomingShareTarget();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        processIncomingShareTarget();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [processIncomingShareTarget]);

  // Listen to Service Worker message broadcast
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'KEEP_SPACE_SHARED_FILES') {
        processIncomingShareTarget();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [processIncomingShareTarget]);

  // Listen to URL query params (?shared=...)
  useEffect(() => {
    if (!window.location.search.includes('shared')) return;
    processIncomingShareTarget();
    const t1 = setTimeout(processIncomingShareTarget, 300);
    const t2 = setTimeout(processIncomingShareTarget, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [processIncomingShareTarget]);

  // Global paste-to-upload: Ctrl+V / Cmd+V or long-press paste on mobile
  useEffect(() => {
    if (!isAuthenticated) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Give pasted images a readable name with timestamp
            const ext = file.type.split('/')[1] || 'png';
            const named = new File(
              [file],
              file.name && file.name !== 'image.png' ? file.name : `pasted_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${ext}`,
              { type: file.type }
            );
            pastedFiles.push(named);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        hapticSuccess();
        setIncomingShare({ files: pastedFiles, link: null });
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isAuthenticated]);

  // Delete file or folder handler (Custom ConfirmModal instead of window.confirm)
  const handleDelete = (id: string, isFolder: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: isFolder ? "Delete Directory" : "Delete Document",
      description: isFolder 
        ? "Are you sure you want to delete this folder? All nested files and subdirectories inside it will be permanently deleted."
        : "Are you sure you want to delete this file? It will be permanently removed from your vault.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const url = isFolder ? `${API_BASE_URL}/api/folders/${id}` : `${API_BASE_URL}/api/documents/${id}`;
          const res = await fetch(url, { method: 'DELETE' });
          
          if (res.ok) {
            hapticSuccess();
            addToast(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
            fetchData({ silent: true });
            fetchStats();
            fetchSidebarFolders();
          } else {
            addToast("Unable to delete item", "error");
          }
        } catch (e) {
          addToast("Network error deleting item", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // Rename file or folder handler (Custom RenameModal instead of window.prompt)
  const handleRename = (id: string, isFolder: boolean, currentName: string) => {
    setRenameModal({
      isOpen: true,
      id,
      isFolder,
      currentName,
      onSave: async (newName: string) => {
        try {
          const url = isFolder ? `${API_BASE_URL}/api/folders/${id}` : `${API_BASE_URL}/api/documents/${id}`;
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
          });

          if (res.ok) {
            hapticSuccess();
            addToast(`${isFolder ? 'Folder' : 'File'} renamed successfully`);
            fetchData({ silent: true });
            fetchSidebarFolders();
          } else {
            const err = await res.json();
            addToast(err.error || "Failed to rename", "error");
          }
        } catch (e) {
          addToast("Network error renaming item", "error");
        } finally {
          setRenameModal(null);
        }
      }
    });
  };

  // Toggle favorite status
  const handleToggleFavorite = async (id: string, currentFav: number) => {
    const nextFav = currentFav === 1 ? 0 : 1;
    // Optimistic UI update
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, favorite: nextFav } : doc));
    hapticLight();
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: nextFav })
      });
      if (res.ok) {
        addToast(nextFav === 1 ? "Added to favorites" : "Removed from favorites");
        fetchData({ silent: true });
      }
    } catch (e) {
      console.error(e);
      fetchData({ silent: true });
    }
  };

  // Handler to move drag-and-drop items
  const handleMoveItem = async (itemId: string, isFolderItem: boolean, targetFolderId: string | null) => {
    try {
      const url = isFolderItem 
        ? `${API_BASE_URL}/api/folders/${itemId}` 
        : `${API_BASE_URL}/api/documents/${itemId}`;
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: targetFolderId })
      });
      
      if (res.ok) {
        addToast("Item moved successfully!");
        fetchData();
        fetchStats();
        fetchSidebarFolders();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to move item", "error");
      }
    } catch (e) {
      addToast("Network error moving item", "error");
    }
  };

  // Handler to generate HMAC signed share URL
  const handleGenerateShareLink = async (expiresIn: number | null): Promise<string> => {
    if (!shareDoc) return '';
    const res = await fetch(`${API_BASE_URL}/api/documents/${shareDoc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires_in: expiresIn })
    });
    if (res.ok) {
      const data = await res.json();
      return data.shareUrl;
    }
    throw new Error("Unable to sign sharing link");
  };

  // Edit document description notes handler
  const handleUpdateDescription = async (id: string, description: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (res.ok) {
        addToast("Notes updated successfully");
        fetchData();
        
        // Refresh local preview state
        const updatedDoc = await res.json();
        setPreviewDoc(updatedDoc);
      } else {
        addToast("Failed to update description", "error");
      }
    } catch (e) {
      addToast("Network error updating description", "error");
    }
  };

  // Handler to open upload panel or prompt for folder creation fast
  const handleOpenUpload = (tab: 'file' | 'folder' | 'link', targetParentId?: string | null) => {
    const parentId = targetParentId !== undefined ? targetParentId : currentFolderId;
    if (tab === 'folder') {
      setRenameModal({
        isOpen: true,
        id: '',
        isFolder: true,
        currentName: '',
        onSave: async (name: string) => {
          if (name && name.trim()) {
            await handleCreateFolder(name.trim(), parentId);
          }
          setRenameModal(null);
        }
      });
    } else {
      if (parentId) {
        setLastUploadFolderId(parentId);
      }
      setActiveUploadTab(tab);
    }
  };

  // Mobile item sheet open handler
  const handleOpenItemSheet = (item: any, isFolder: boolean) => {
    setMobileItemSheet({
      isOpen: true,
      item,
      isFolder
    });
  };

  // Pull-to-refresh handlers
  const handleMainTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      pullTouchStartRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleMainTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - pullTouchStartRef.current;
    if (delta > 0 && e.currentTarget.scrollTop === 0) {
      setPullDistance(Math.min(delta * 0.45, 80));
    }
  };

  const handleMainTouchEnd = async () => {
    if (!isPulling) return;
    if (pullDistance > 55) {
      hapticLight();
      setPullDistance(0);
      setIsPulling(false);
      await Promise.all([
        fetchData({ silent: true }),
        fetchStats(),
        fetchSidebarFolders()
      ]);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onUnlock={handleUnlock} />;
  }

  return (
    <div className="app-shell">
      {/* Slim Top Glowing Progress Line for silent refreshes */}
      <div className={`top-loader-bar ${isRefreshing ? 'active' : ''}`} />

      {/* Toast Overlay */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Sidebar Component */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentTab={currentTab}
        setCurrentTab={handleSelectTab}
        folders={sidebarFolders} // Always display top-level root folders
        currentFolderId={currentFolderId}
        setCurrentFolderId={handleNavigateFolder}
        onOpenUpload={handleOpenUpload}
        canInstall={canInstall}
        triggerInstall={triggerInstall}
        stats={stats}
        onLogout={handleLogout}
      />

      {/* Sidebar Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <main 
        className="main-area"
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
      >
        {/* Pull to refresh visual indicator */}
        {pullDistance > 0 && (
          <div className="pull-to-refresh-indicator" style={{ height: `${pullDistance}px`, opacity: pullDistance / 55 }}>
            <div className={`pull-refresh-spinner ${pullDistance > 55 ? 'ready' : ''}`} />
          </div>
        )}

        {/* Header Area */}
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)} title="Open Menu">
              <Menu size={18} />
            </button>
            <div 
              className="search-bar" 
              onClick={() => {
                if (window.innerWidth <= 768) {
                  handleOpenSearch();
                } else {
                  searchInputRef.current?.focus();
                }
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input 
                ref={searchInputRef}
                type="text" 
                className="search-input" 
                placeholder="Search folders and documents..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchQuery ? (
                <button 
                  className="search-bar-clear-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearch('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="kbd-badge" title="Press ⌘K or / to search">⌘K</span>
              )}
            </div>
          </div>

          <div className="header-actions">
            {!isOnline && (
              <span style={{ fontSize: '12px', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                Offline Mode
              </span>
            )}
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Path Navigation breadcrumbs */}
        <Breadcrumbs 
          breadcrumbs={breadcrumbs}
          setCurrentFolderId={handleNavigateFolder}
        />

        {/* Content Viewer Grid */}
        <FolderView 
          isLoading={isLoading}
          currentTab={currentTab}
          folderName={folderName}
          subfolders={folders}
          documents={documents}
          searchQuery={searchQuery}
          onNavigateFolder={handleNavigateFolder}
          onPreviewDocument={handleOpenPreview}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onRename={handleRename}
          onOpenUpload={handleOpenUpload}
          cardSize={cardSize}
          setCardSize={handleSetCardSize}
          onMoveItem={handleMoveItem}
          onShare={handleOpenShare}
          onOpenItemSheet={handleOpenItemSheet}
        />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar
        currentTab={currentTab}
        currentFolderId={currentFolderId}
        onNavigateTab={handleSelectTab}
        onOpenActionSheet={() => setMobileActionSheetOpen(true)}
        onOpenSearch={handleOpenSearch}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Mobile Instant Search Overlay */}
      <MobileSearchModal
        isOpen={mobileSearchOpen}
        onClose={handleCloseSearch}
        onSelectDocument={handleOpenPreview}
        onSelectFolder={handleNavigateFolder}
      />

      {/* Mobile Quick-Action Sheet (+ FAB) */}
      <MobileActionSheet
        isOpen={mobileActionSheetOpen}
        onClose={() => setMobileActionSheetOpen(false)}
        onUploadFiles={async (files, parentId) => {
          await handleUploadFiles(files, parentId);
        }}
        onOpenUploadModal={(tab, parentId) => {
          handleOpenUpload(tab, parentId);
        }}
        onPastePhoto={(files) => {
          hapticSuccess();
          setIncomingShare({ files, link: null });
        }}
        currentFolderId={currentFolderId}
        currentFolderName={folderName}
      />

      {/* Mobile Document Actions Sheet */}
      {mobileItemSheet && (
        <MobileItemSheet
          isOpen={mobileItemSheet.isOpen}
          item={mobileItemSheet.item}
          isFolder={mobileItemSheet.isFolder}
          onClose={() => setMobileItemSheet(null)}
          onPreview={(doc) => {
            if (mobileItemSheet.isFolder) {
              handleNavigateFolder(doc.id);
            } else {
              handleOpenPreview(doc);
            }
          }}
          onDownload={async (item) => {
            await downloadDocument(`${API_BASE_URL}/api/documents/${item.id}/download`, item.name);
          }}
          onToggleFavorite={handleToggleFavorite}
          onRename={handleRename}
          onDelete={handleDelete}
          onShare={handleOpenShare}
        />
      )}

      {/* Custom Confirmation Modal (replacing window.confirm) */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Custom Rename Modal (replacing window.prompt) */}
      {renameModal && (
        <RenameModal
          isOpen={renameModal.isOpen}
          currentName={renameModal.currentName}
          isFolder={renameModal.isFolder}
          onSave={renameModal.onSave}
          onClose={() => setRenameModal(null)}
        />
      )}

      {/* Upload Wizard Overlay */}
      {activeUploadTab && (
        <UploadModal 
          initialTab={activeUploadTab}
          onClose={() => setActiveUploadTab(null)}
          onCreateFolder={handleCreateFolder}
          onSaveLink={handleSaveLink}
          onUploadFiles={handleUploadFiles}
          currentFolderId={currentFolderId || lastUploadFolderId || null}
        />
      )}

      {/* Document Detail Preview Overlay */}
      {previewDoc && (
        <FilePreview 
          document={previewDoc}
          onClose={handleClosePreview}
          onUpdateDescription={handleUpdateDescription}
        />
      )}

      {/* Share Document Overlay Modal */}
      {shareDoc && (
        <ShareModal 
          document={shareDoc}
          onClose={handleCloseShare}
          onGenerateShareLink={handleGenerateShareLink}
          onAddToast={addToast}
        />
      )}

      {/* OS Share Sheet Target Modal (Allows Selecting Destination Folder) */}
      {incomingShare && (
        <ShareTargetModal
          isOpen={!!incomingShare}
          sharedFiles={incomingShare.files}
          sharedLink={incomingShare.link}
          initialFolderId={currentFolderId}
          onClose={() => setIncomingShare(null)}
          onConfirmUpload={async (files, targetFolderId) => {
            await handleUploadFiles(files, targetFolderId);
            setIncomingShare(null);
          }}
          onConfirmSaveLink={async (url, desc, targetFolderId) => {
            await handleSaveLink(url, desc, targetFolderId);
            setIncomingShare(null);
          }}
        />
      )}
    </div>
  );
}

