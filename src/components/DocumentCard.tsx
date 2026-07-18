import React from 'react';
import { API_BASE_URL } from '../config';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  File, 
  Heart, 
  Download, 
  Trash2, 
  Eye,
  ExternalLink,
  Share2,
  Edit3
} from 'lucide-react';

interface DocumentCardProps {
  item: any; // document or folder
  isFolder: boolean;
  onNavigate: (id: string) => void;
  onPreview: (doc: any) => void;
  onToggleFavorite?: (id: string, currentFav: number) => void;
  onDelete: (id: string, isFolder: boolean) => void;
  onRename?: (id: string, isFolder: boolean, currentName: string) => void;
  onMoveItem?: (itemId: string, isFolderItem: boolean, targetFolderId: string | null) => void;
  onShare?: (doc: any) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  item,
  isFolder,
  onNavigate,
  onPreview,
  onToggleFavorite,
  onDelete,
  onRename,
  onMoveItem,
  onShare,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: item.id,
      isFolder: isFolder
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (isFolder) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isFolder) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      setIsDragOver(false);
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        const draggedData = JSON.parse(rawData);
        if (draggedData.id === item.id && draggedData.isFolder === isFolder) {
          return;
        }
        if (onMoveItem) {
          onMoveItem(draggedData.id, draggedData.isFolder, item.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };
  // Format sizes
  const formatSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  if (isFolder) {
    return (
      <div 
        className={`card-item ${isDragOver ? 'drag-over' : ''}`} 
        onClick={() => onNavigate(item.id)}
        draggable={true}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="card-icon-row">
          <div className="card-icon-box icon-folder">
            <Folder size={24} />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {onRename && (
              <button 
                className="card-action-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(item.id, true, item.name);
                }}
                title="Rename Directory"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button 
              className="card-action-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id, true);
              }}
              title="Delete Directory"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="card-info">
          <span className="card-name" title={item.name}>{item.name}</span>
          <div className="card-meta">
            <span>Directory</span>
            <span className="card-meta-dot"></span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Get matching icon based on type
  const getIcon = () => {
    switch (item.type) {
      case 'pdf': return <FileText size={24} />;
      case 'image': return <ImageIcon size={24} />;
      case 'video': return <VideoIcon size={24} />;
      case 'link': return <LinkIcon size={24} />;
      default: return <File size={24} />;
    }
  };

  const getIconClass = () => {
    switch (item.type) {
      case 'pdf': return 'icon-pdf';
      case 'image': return 'icon-image';
      case 'video': return 'icon-video';
      case 'link': return 'icon-link';
      default: return 'icon-other';
    }
  };

  return (
    <div 
      className="card-item" 
      onClick={() => onPreview(item)}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <div className="card-icon-row">
        <div className={`card-icon-box ${getIconClass()}`}>
          {getIcon()}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onToggleFavorite && (
            <button 
              className={`card-favorite-btn ${item.favorite === 1 ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id, item.favorite);
              }}
              title={item.favorite === 1 ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Heart size={16} fill={item.favorite === 1 ? "#ef4444" : "none"} />
            </button>
          )}
          
          {item.type !== 'link' ? (
            <a 
              href={`${API_BASE_URL}/api/documents/${item.id}/download?download=true`} 
              className="card-action-btn"
              onClick={(e) => e.stopPropagation()}
              title="Download File"
              download
            >
              <Download size={16} />
            </a>
          ) : (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="card-action-btn"
              onClick={(e) => e.stopPropagation()}
              title="Open Link"
            >
              <ExternalLink size={16} />
            </a>
          )}

          {onShare && (
            <button 
              className="card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onShare(item);
              }}
              title="Share Document"
            >
              <Share2 size={16} />
            </button>
          )}

          {onRename && (
            <button 
              className="card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRename(item.id, false, item.name);
              }}
              title="Rename File"
            >
              <Edit3 size={16} />
            </button>
          )}

          <button 
            className="card-action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id, false);
            }}
            title="Delete File"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="card-info">
        <span className="card-name" title={item.name}>{item.name}</span>
        
        {/* Render interactive Image/Video/Link previews */}
        {item.type === 'image' && (
          <div className="card-preview">
            <img src={`${API_BASE_URL}/api/documents/${item.id}/download`} alt={item.name} loading="lazy" />
          </div>
        )}

        {item.type === 'link' && item.thumbnail_url && (
          <div className="card-preview">
            <img src={item.thumbnail_url} alt={item.name} loading="lazy" />
          </div>
        )}

        {item.type === 'video' && (
          <div className="card-preview" style={{ background: '#000' }}>
            <VideoIcon size={32} color="var(--text-muted)" />
          </div>
        )}

        {item.type === 'pdf' && (
          <div className="card-preview">
            <FileText size={32} color="var(--danger)" />
          </div>
        )}

        <div className="card-meta" style={{ marginTop: '4px' }}>
          <span>{item.type.toUpperCase()}</span>
          {item.size !== null && (
            <>
              <span className="card-meta-dot"></span>
              <span>{formatSize(item.size)}</span>
            </>
          )}
          <span className="card-meta-dot"></span>
          <span>{formatDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
