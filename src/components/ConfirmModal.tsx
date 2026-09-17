import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { hapticWarning, hapticLight } from '../utils/haptics';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDanger = true,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    hapticWarning();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirmClick = () => {
    hapticLight();
    onConfirm();
  };

  const handleCancelClick = () => {
    hapticLight();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content confirm-modal-box">
        <div className="confirm-modal-header">
          <div className={`confirm-icon-badge ${isDanger ? 'danger' : 'warning'}`}>
            {isDanger ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <button className="modal-close" onClick={handleCancelClick} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="confirm-modal-body">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-desc">{description}</p>
        </div>

        <div className="confirm-modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary confirm-cancel-btn" 
            onClick={handleCancelClick}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} confirm-action-btn`} 
            onClick={handleConfirmClick}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
