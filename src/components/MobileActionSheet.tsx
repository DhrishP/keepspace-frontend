import React, { useState, useRef, useEffect } from 'react';
import { Camera, UploadCloud, FolderPlus, Link2, Folder, X, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFiles: (files: FileList, parentId: string | null) => Promise<void>;
  onOpenUploadModal: (tab: 'file' | 'folder' | 'link', parentId?: string | null) => void;
  currentFolderId: string | null;
  currentFolderName: string | null;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  onUploadFiles,
  onOpenUploadModal,
  currentFolderId,
  currentFolderName,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [destinationFolderId, setDestinationFolderId] = useState<string>(currentFolderId || '');
  const [allFolders, setAllFolders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setDestinationFolderId(currentFolderId || '');

    // Fetch all folders for destination selection
    fetch(`${API_BASE_URL}/api/all-folders`)
      .then((res) => res.json())
      .then((data) => setAllFolders(data || []))
      .catch((err) => console.error("Error fetching folders:", err));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentFolderId, onClose]);

  if (!isOpen) return null;

  const handleCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      hapticLight();
      onClose();
      await onUploadFiles(e.target.files, destinationFolderId || null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      hapticLight();
      onClose();
      await onUploadFiles(e.target.files, destinationFolderId || null);
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
            <p className="mobile-sheet-subtitle">Choose action and destination</p>
          </div>
          <button className="mobile-sheet-close-btn" onClick={onClose} aria-label="Close sheet">
            <X size={18} />
          </button>
        </div>

        {/* Destination Folder Selector */}
        <div className="mobile-destination-box">
          <div className="mobile-destination-label">
            <Folder size={16} className="mobile-dest-icon" />
            <span>Upload into:</span>
          </div>
          <div className="mobile-destination-select-wrapper">
            <select
              className="mobile-destination-select"
              value={destinationFolderId}
              onChange={(e) => {
                hapticLight();
                setDestinationFolderId(e.target.value);
              }}
            >
              <option value="">📁 Main Vault (Root)</option>
              {allFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  📁 {folder.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="mobile-destination-arrow" />
          </div>
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
              onOpenUploadModal('folder', destinationFolderId || null);
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
              onOpenUploadModal('link', destinationFolderId || null);
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
