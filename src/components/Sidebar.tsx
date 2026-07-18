import React from 'react';
import { 
  Folder, 
  FolderPlus, 
  HardDrive, 
  Heart, 
  Image as ImageIcon, 
  FileText, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  Download,
  Search,
  ChevronRight,
  FolderOpen,
  X,
  Lock
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  folders: any[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  onOpenUpload: (tab: 'file' | 'folder' | 'link') => void;
  canInstall: boolean;
  triggerInstall: () => void;
  stats: {
    totalCount: number;
    foldersCount: number;
    byType: { type: string; count: number; total_size: number | null }[];
  } | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  currentTab,
  setCurrentTab,
  folders,
  currentFolderId,
  setCurrentFolderId,
  onOpenUpload,
  canInstall,
  triggerInstall,
  stats,
  onLogout
}) => {
  // Compute storage used
  const totalSizeBytes = stats?.byType.reduce((acc, curr) => acc + (curr.total_size || 0), 0) || 0;
  const storageLimitBytes = 100 * 1024 * 1024; // 100 MB limit
  const storagePercentage = Math.min((totalSizeBytes / storageLimitBytes) * 100, 100);

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const navItems = [
    { id: 'all', label: 'All Files', icon: HardDrive },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'pdf', label: 'PDFs', icon: FileText },
    { id: 'image', label: 'Photos', icon: ImageIcon },
    { id: 'video', label: 'Videos', icon: VideoIcon },
    { id: 'link', label: 'Links', icon: LinkIcon },
  ];

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="16" height="16" fill="none">
              <rect x="26" y="26" width="48" height="48" rx="8" stroke="currentColor" strokeWidth="10" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="10" />
              <line x1="50" y1="26" x2="50" y2="38" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            </svg>
          </div>
          <div className="logo-text">KeepSpace<span className="logo-dot">.</span></div>
        </div>
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id && !currentFolderId ? 'active' : ''}`}
              onClick={() => {
                setCurrentFolderId(null);
                setCurrentTab(item.id);
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="sidebar-section-title">Quick Actions</div>
        <button className="nav-item" onClick={() => onOpenUpload('folder')}>
          <FolderPlus size={18} />
          <span>New Folder</span>
        </button>

        <div className="sidebar-section-title">Directories</div>
        <div className="folder-tree">
          {folders.length === 0 ? (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No directories created
            </div>
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                className={`folder-tree-node ${currentFolderId === folder.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentFolderId(folder.id);
                  setCurrentTab('all');
                }}
                style={{
                  fontWeight: currentFolderId === folder.id ? '600' : 'normal',
                  color: currentFolderId === folder.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                {currentFolderId === folder.id ? <FolderOpen size={14} className="icon-folder" /> : <Folder size={14} className="icon-folder" />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </span>
              </div>
            ))
          )}
        </div>

        {canInstall && (
          <div style={{ marginTop: 'auto', padding: '10px 0' }}>
            <button className="btn btn-primary" style={{ width: '100%', gap: '8px' }} onClick={triggerInstall}>
              <Download size={16} />
              Install PWA App
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="storage-stats">
          <div className="storage-header">
            <span>Storage Capacity</span>
            <span>{formatBytes(totalSizeBytes)} / 100 MB</span>
          </div>
          <div className="storage-bar">
            <div className="storage-used" style={{ width: `${storagePercentage}%` }}></div>
          </div>
        </div>
        
        <button 
          onClick={onLogout} 
          style={{
            width: '100%',
            marginTop: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px dashed rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          className="lock-btn"
        >
          <Lock size={14} />
          Lock Vault
        </button>
      </div>
    </aside>
  );
};
