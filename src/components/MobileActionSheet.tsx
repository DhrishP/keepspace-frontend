import React, { useRef, useEffect } from 'react';
import { Camera, UploadCloud, FolderPlus, Link2, X } from 'lucide-react';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFiles: (files: FileList) => Promise<void>;
  onOpenUploadModal: (tab: 'file' | 'folder' | 'link') => void;
  currentFolderName: string | null;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  onUploadFiles,
  onOpenUploadModal,
  currentFolderName,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      hapticLight();
      onClose();
      await onUploadFiles(e.target.files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      hapticLight();
      onClose();
      await onUploadFiles(e.target.files);
    }
  };

  return (
    <div className="mobile-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Hidden file inputs for direct native triggers */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*,application/pdf"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraSelect}
      />
      <input
        type="file"
        ref={fileInputRef}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div className="mobile-action-sheet-box">
        <div className="mobile-sheet-handle-bar" />
        
        <div className="mobile-sheet-header">
          <div>
            <h3 className="mobile-sheet-title">Add to Vault</h3>
            <p className="mobile-sheet-subtitle">
              {currentFolderName ? `Destination: ${currentFolderName}` : 'Destination: Vault Root'}
            </p>
          </div>
          <button className="mobile-sheet-close-btn" onClick={onClose} aria-label="Close sheet">
            <X size={18} />
          </button>
        </div>

        <div className="mobile-action-grid">
          {/* Option 1: Quick Camera / Doc Scan */}
          <button 
            type="button"
            className="mobile-action-card"
            onClick={() => {
              hapticSelection();
              cameraInputRef.current?.click();
            }}
          >
            <div className="mobile-action-icon camera">
              <Camera size={22} />
            </div>
            <div className="mobile-action-texts">
              <span className="mobile-action-name">Scan / Camera</span>
              <span className="mobile-action-desc">Snap doc or ID directly</span>
            </div>
          </button>

          {/* Option 2: Upload Files */}
          <button 
            type="button"
            className="mobile-action-card"
            onClick={() => {
              hapticSelection();
              fileInputRef.current?.click();
            }}
          >
            <div className="mobile-action-icon upload">
              <UploadCloud size={22} />
            </div>
            <div className="mobile-action-texts">
              <span className="mobile-action-name">Upload Files</span>
              <span className="mobile-action-desc">PDFs, images, videos</span>
            </div>
          </button>

          {/* Option 3: New Folder */}
          <button 
            type="button"
            className="mobile-action-card"
            onClick={() => {
              hapticLight();
              onClose();
              onOpenUploadModal('folder');
            }}
          >
            <div className="mobile-action-icon folder">
              <FolderPlus size={22} />
            </div>
            <div className="mobile-action-texts">
              <span className="mobile-action-name">New Folder</span>
              <span className="mobile-action-desc">Create directory</span>
            </div>
          </button>

          {/* Option 4: Add Link */}
          <button 
            type="button"
            className="mobile-action-card"
            onClick={() => {
              hapticLight();
              onClose();
              onOpenUploadModal('link');
            }}
          >
            <div className="mobile-action-icon link">
              <Link2 size={22} />
            </div>
            <div className="mobile-action-texts">
              <span className="mobile-action-name">Save Link</span>
              <span className="mobile-action-desc">Add web bookmark</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
