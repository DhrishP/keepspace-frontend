import React, { useState, useEffect, useRef } from 'react';
import { Edit3, X } from 'lucide-react';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  isFolder: boolean;
  onSave: (newName: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  currentName,
  isFolder,
  onSave,
  onClose,
  isLoading = false,
}) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(currentName);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentName, isFolder, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onClose();
      return;
    }
    hapticSuccess();
    onSave(trimmed);
  };

  const handleCancel = () => {
    hapticLight();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className="modal-content rename-modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="card-icon-box icon-folder" style={{ width: '32px', height: '32px' }}>
              <Edit3 size={16} />
            </div>
            <h3 className="modal-title">Rename {isFolder ? 'Folder' : 'File'}</h3>
          </div>
          <button className="modal-close" onClick={handleCancel} title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px 0' }}>
            <label className="form-label" htmlFor="rename-input">
              {isFolder ? 'Folder Name' : 'File Name'}
            </label>
            <input
              id="rename-input"
              ref={inputRef}
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter new ${isFolder ? 'folder' : 'file'} name`}
              required
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <div className="modal-footer" style={{ borderTop: 'none', padding: '0 0 4px 0' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !name.trim() || name.trim() === currentName}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
