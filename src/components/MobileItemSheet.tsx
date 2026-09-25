import React, { useEffect } from 'react';
import { 
  Eye, 
  Download, 
  Share2, 
  Heart, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  File, 
  X 
} from 'lucide-react';
import { hapticLight, hapticWarning, hapticSuccess } from '../utils/haptics';

interface MobileItemSheetProps {
  isOpen: boolean;
  item: any;
  isFolder: boolean;
  onClose: () => void;
  onPreview: (doc: any) => void;
  onDownload?: (item: any) => void;
  onToggleFavorite?: (id: string, currentFav: number) => void;
  onRename: (id: string, isFolder: boolean, currentName: string) => void;
  onDelete: (id: string, isFolder: boolean) => void;
  onShare?: (doc: any) => void;
}

export const MobileItemSheet: React.FC<MobileItemSheetProps> = ({
  isOpen,
  item,
  isFolder,
  onClose,
  onPreview,
  onDownload,
  onToggleFavorite,
  onRename,
  onDelete,
  onShare,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const getIcon = () => {
    if (isFolder) return <Folder size={22} />;
    switch (item.type) {
      case 'pdf': return <FileText size={22} />;
      case 'image': return <ImageIcon size={22} />;
      case 'video': return <VideoIcon size={22} />;
      case 'link': return <LinkIcon size={22} />;
      default: return <File size={22} />;
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="mobile-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mobile-item-sheet-box">
        <div className="mobile-sheet-handle-bar" />

        {/* Item Summary Header */}
        <div className="mobile-item-sheet-header">
          <div className={`card-icon-box icon-${isFolder ? 'folder' : (item.type || 'other')}`} style={{ width: '40px', height: '40px', flexShrink: 0 }}>
            {getIcon()}
          </div>
          <div className="mobile-item-sheet-info">
            <h4 className="mobile-item-sheet-title">{item.name}</h4>
            <div className="mobile-item-sheet-meta">
              {isFolder ? 'Directory' : (
                <>
                  <span style={{ textTransform: 'uppercase' }}>{item.type}</span>
                  {item.size ? <> • <span>{formatSize(item.size)}</span></> : null}
                </>
              )}
            </div>
          </div>
          <button className="mobile-sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Actions List with large 48px touch targets */}
        <div className="mobile-item-actions-list">
          {/* Action: Preview / Open */}
          <button 
            className="mobile-item-action-row"
            onClick={() => {
              hapticLight();
              onClose();
              onPreview(item);
            }}
          >
            <div className="mobile-item-action-icon">
              {item.type === 'link' ? <ExternalLink size={18} /> : <Eye size={18} />}
            </div>
            <span>{isFolder ? 'Open Folder' : (item.type === 'link' ? 'Open Link' : 'Preview Document')}</span>
          </button>

          {/* Action: Download (Non-folder, non-link) */}
          {!isFolder && item.type !== 'link' && onDownload && (
            <button 
              className="mobile-item-action-row"
              onClick={() => {
                hapticSuccess();
                onClose();
                onDownload(item);
              }}
            >
              <div className="mobile-item-action-icon">
                <Download size={18} />
              </div>
              <span>Download File</span>
            </button>
          )}

          {/* Action: Share */}
          {!isFolder && onShare && (
            <button 
              className="mobile-item-action-row"
              onClick={() => {
                hapticLight();
                onClose();
                onShare(item);
              }}
            >
              <div className="mobile-item-action-icon">
                <Share2 size={18} />
              </div>
              <span>Share Expiring Link</span>
            </button>
          )}

          {/* Action: Favorite */}
          {!isFolder && onToggleFavorite && (
            <button 
              className="mobile-item-action-row"
              onClick={() => {
                hapticLight();
                onClose();
                onToggleFavorite(item.id, item.favorite);
              }}
            >
              <div className="mobile-item-action-icon">
                <Heart size={18} fill={item.favorite === 1 ? "#ef4444" : "none"} color={item.favorite === 1 ? "#ef4444" : "currentColor"} />
              </div>
              <span>{item.favorite === 1 ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
          )}

          {/* Action: Rename */}
          <button 
            className="mobile-item-action-row"
            onClick={() => {
              hapticLight();
              onClose();
              onRename(item.id, isFolder, item.name);
            }}
          >
            <div className="mobile-item-action-icon">
              <Edit3 size={18} />
            </div>
            <span>Rename {isFolder ? 'Folder' : 'File'}</span>
          </button>

          {/* Action: Delete */}
          <button 
            className="mobile-item-action-row danger"
            onClick={() => {
              hapticWarning();
              onClose();
              onDelete(item.id, isFolder);
            }}
          >
            <div className="mobile-item-action-icon danger">
              <Trash2 size={18} />
            </div>
            <span>Delete {isFolder ? 'Directory' : 'File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
