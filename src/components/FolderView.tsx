import React from 'react';
import { Plus, Search, FolderOpen, AlertCircle } from 'lucide-react';
import { DocumentCard } from './DocumentCard';

interface FolderViewProps {
  currentTab: string;
  folderName: string | null;
  subfolders: any[];
  documents: any[];
  searchQuery: string;
  onNavigateFolder: (id: string) => void;
  onPreviewDocument: (doc: any) => void;
  onToggleFavorite?: (id: string, currentFav: number) => void;
  onDelete: (id: string, isFolder: boolean) => void;
  onOpenUpload: (tab: 'file' | 'folder' | 'link') => void;
  cardSize: 'sm' | 'md' | 'lg';
  setCardSize: (size: 'sm' | 'md' | 'lg') => void;
  onMoveItem?: (itemId: string, isFolderItem: boolean, targetFolderId: string | null) => void;
  onShare?: (doc: any) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  currentTab,
  folderName,
  subfolders,
  documents,
  searchQuery,
  onNavigateFolder,
  onPreviewDocument,
  onToggleFavorite,
  onDelete,
  onOpenUpload,
  cardSize,
  setCardSize,
  onMoveItem,
  onShare,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    // Only accept drag if we are inside a subfolder (allow moving back to root)
    if (folderName !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (folderName !== null) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (folderName !== null) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (folderName !== null) {
      e.preventDefault();
      setIsDragOver(false);
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        const draggedData = JSON.parse(rawData);
        if (onMoveItem) {
          onMoveItem(draggedData.id, draggedData.isFolder, null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };
  // Title computations
  const getTabTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (folderName) return folderName;
    
    switch (currentTab) {
      case 'all': return 'All Documents';
      case 'favorites': return 'Favorites';
      case 'pdf': return 'PDF Files';
      case 'image': return 'Photos & Images';
      case 'video': return 'Video Library';
      case 'link': return 'Bookmarks & Links';
      default: return 'Documents';
    }
  };

  const isEmpty = subfolders.length === 0 && documents.length === 0;

  return (
    <div 
      className={`content-pane ${isDragOver ? 'drag-over-bg' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="section-header">
        <h2 className="section-title">{getTabTitle()}</h2>
        {!searchQuery && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="size-selector-pill">
              <button 
                className={`size-btn ${cardSize === 'sm' ? 'active' : ''}`}
                onClick={() => setCardSize('sm')}
                title="Compact Cards"
              >
                S
              </button>
              <button 
                className={`size-btn ${cardSize === 'md' ? 'active' : ''}`}
                onClick={() => setCardSize('md')}
                title="Regular Cards"
              >
                M
              </button>
              <button 
                className={`size-btn ${cardSize === 'lg' ? 'active' : ''}`}
                onClick={() => setCardSize('lg')}
                title="Large Photos"
              >
                L
              </button>
            </div>

            <button className="btn btn-secondary" onClick={() => onOpenUpload('link')}>
              Add Link
            </button>
            <button className="btn btn-primary" onClick={() => onOpenUpload('file')}>
              <Plus size={16} />
              Upload Files
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <FolderOpen size={48} color="var(--text-muted)" />
          <h3 className="empty-state-title">This directory is empty</h3>
          <p style={{ fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
            Get started by creating a new subfolder or uploading files and external URLs.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn btn-secondary" onClick={() => onOpenUpload('folder')}>
              New Folder
            </button>
            <button className="btn btn-primary" onClick={() => onOpenUpload('file')}>
              Upload File
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Render Subfolders Grid */}
          {subfolders.length > 0 && (
            <div>
              <h3 className="sidebar-section-title" style={{ marginLeft: 0, marginBottom: '12px' }}>Directories</h3>
              <div className={`items-grid grid-${cardSize}`}>
                {subfolders.map((folder) => (
                  <DocumentCard
                    key={folder.id}
                    item={folder}
                    isFolder={true}
                    onNavigate={onNavigateFolder}
                    onPreview={() => {}}
                    onDelete={onDelete}
                    onMoveItem={onMoveItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Render Documents Grid */}
          {documents.length > 0 && (
            <div>
              <h3 className="sidebar-section-title" style={{ marginLeft: 0, marginBottom: '12px' }}>Files</h3>
              <div className={`items-grid grid-${cardSize}`}>
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    item={doc}
                    isFolder={false}
                    onNavigate={() => {}}
                    onPreview={onPreviewDocument}
                    onToggleFavorite={onToggleFavorite}
                    onDelete={onDelete}
                    onMoveItem={onMoveItem}
                    onShare={onShare}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
