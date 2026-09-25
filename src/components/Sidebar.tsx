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
  onMoveItem?: (itemId: string, isFolderItem: boolean, targetFolderId: string | null) => void;
  onUploadFiles?: (files: FileList | File[], parentId?: string | null) => Promise<void>;
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
  onLogout,
  onMoveItem,
  onUploadFiles,
}) => {
  const [dragOverTargetId, setDragOverTargetId] = React.useState<string | null>(null);

  const handleDropOnTarget = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    // 1. External files from Mac Finder / desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onUploadFiles) {
        onUploadFiles(e.dataTransfer.files, targetId);
      }
      return;
    }

    // 2. Internal file or folder card move
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data.id === targetId && data.isFolder) return;
      if (onMoveItem) {
        onMoveItem(data.id, data.isFolder, targetId);
      }
    } catch (err) {
      console.error(err);
    }
  };
  // Compute storage used (1 GB capacity)
  const totalSizeBytes = stats?.byType.reduce((acc, curr) => acc + (curr.total_size || 0), 0) || 0;
  const storageLimitBytes = 1024 * 1024 * 1024; // 1 GB limit
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
          const isAllFiles = item.id === 'all';
          const isDropOverRoot = dragOverTargetId === 'root' && isAllFiles;

          return (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id && !currentFolderId ? 'active' : ''} ${isDropOverRoot ? 'sidebar-drop-active' : ''}`}
              onClick={() => {
                setCurrentFolderId(null);
                setCurrentTab(item.id);
              }}
              onDragOver={isAllFiles ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              } : undefined}
              onDragEnter={isAllFiles ? (e) => {
                e.preventDefault();
                setDragOverTargetId('root');
              } : undefined}
              onDragLeave={isAllFiles ? (e) => {
                e.preventDefault();
                if (dragOverTargetId === 'root') setDragOverTargetId(null);
              } : undefined}
              onDrop={isAllFiles ? (e) => handleDropOnTarget(e, null) : undefined}
              title={isAllFiles ? "Drop here to move or upload to Root directory" : undefined}
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
            folders.map((folder) => {
              const isOverFolder = dragOverTargetId === folder.id;
              return (
                <div
                  key={folder.id}
                  className={`folder-tree-node ${currentFolderId === folder.id ? 'active' : ''} ${isOverFolder ? 'sidebar-drop-active' : ''}`}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setCurrentTab('all');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverTargetId(folder.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (dragOverTargetId === folder.id) setDragOverTargetId(null);
                  }}
                  onDrop={(e) => handleDropOnTarget(e, folder.id)}
                  title={`Drop here to move or upload to "${folder.name}"`}
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
              );
            })
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
            <span>{formatBytes(totalSizeBytes)} / 1 GB</span>
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
