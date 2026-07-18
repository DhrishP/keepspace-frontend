import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FolderView } from './components/FolderView';
import { FilePreview } from './components/FilePreview';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { Toast, ToastMessage } from './components/Toast';
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
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Tab and Folder navigation state
  const [currentTab, setCurrentTab] = useState<string>('all'); // all, favorites, pdf, image, video, link
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Data loading states
  const [folderName, setFolderName] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Modal / Preview Overlay States
  const [activeUploadTab, setActiveUploadTab] = useState<'file' | 'folder' | 'link' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [shareDoc, setShareDoc] = useState<any | null>(null);
  
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
  const fetchData = async () => {
    const cacheKey = currentFolderId ? `folder_${currentFolderId}` : `tab_${currentTab}`;
    try {
      let url = `${API_BASE_URL}/api/folders`;
      if (currentFolderId) {
        url = `${API_BASE_URL}/api/folders/${currentFolderId}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFolderName(data.folder ? data.folder.name : null);
        setBreadcrumbs(data.breadcrumbs || []);
        
        // Filter folders/files depending on search query or tab filters
        let allSubfolders = data.subfolders || [];
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
        fetchData();
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
        fetchData();
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
  const handleUploadFiles = async (files: FileList, parentId?: string | null) => {
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
      addToast(`Successfully uploaded ${successCount} file(s)`);
      updateLastUploadFolder(targetParentId);
    }
    if (failCount > 0) {
      addToast(`Failed to upload ${failCount} file(s)`, 'error');
    }

    fetchData();
    fetchStats();
  };

  // Delete file or folder handler
  const handleDelete = async (id: string, isFolder: boolean) => {
    const confirmMessage = isFolder 
      ? "Are you sure you want to delete this folder? All nested subfolders and files inside it will be permanently deleted."
      : "Are you sure you want to delete this file?";
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const url = isFolder ? `${API_BASE_URL}/api/folders/${id}` : `${API_BASE_URL}/api/documents/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      
      if (res.ok) {
        addToast(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
        fetchData();
        fetchStats();
        fetchSidebarFolders();
      } else {
        addToast("Unable to delete item", "error");
      }
    } catch (e) {
      addToast("Network error deleting item", "error");
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (id: string, currentFav: number) => {
    const nextFav = currentFav === 1 ? 0 : 1;
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: nextFav })
      });
      if (res.ok) {
        addToast(nextFav === 1 ? "Added to favorites" : "Removed from favorites");
        fetchData();
      }
    } catch (e) {
      console.error(e);
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
  const handleOpenUpload = (tab: 'file' | 'folder' | 'link') => {
    if (tab === 'folder') {
      const name = window.prompt("Enter new folder name:");
      if (name && name.trim()) {
        handleCreateFolder(name.trim());
      }
    } else {
      setActiveUploadTab(tab);
    }
  };

  if (!isAuthenticated) {
    return <Login onUnlock={handleUnlock} />;
  }

  return (
    <div className="app-shell">
      {/* Toast Overlay */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Sidebar Component */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        folders={sidebarFolders} // Always display top-level root folders
        currentFolderId={currentFolderId}
        setCurrentFolderId={setCurrentFolderId}
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
      <main className="main-area">
        {/* Header Area */}
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)} title="Open Menu">
              <Menu size={18} />
            </button>
            <div className="search-bar">
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search folders and documents..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
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
          setCurrentFolderId={setCurrentFolderId}
        />

        {/* Content Viewer Grid */}
        <FolderView 
          currentTab={currentTab}
          folderName={folderName}
          subfolders={folders}
          documents={documents}
          searchQuery={searchQuery}
          onNavigateFolder={setCurrentFolderId}
          onPreviewDocument={setPreviewDoc}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onOpenUpload={handleOpenUpload}
          cardSize={cardSize}
          setCardSize={handleSetCardSize}
          onMoveItem={handleMoveItem}
          onShare={setShareDoc}
        />
      </main>

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
          onClose={() => setPreviewDoc(null)}
          onUpdateDescription={handleUpdateDescription}
        />
      )}

      {/* Share Document Overlay Modal */}
      {shareDoc && (
        <ShareModal 
          document={shareDoc}
          onClose={() => setShareDoc(null)}
          onGenerateShareLink={handleGenerateShareLink}
          onAddToast={addToast}
        />
      )}
    </div>
  );
}
