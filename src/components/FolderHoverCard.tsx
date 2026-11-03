import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronRight, Loader2, FolderTree } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { hapticLight } from '../utils/haptics';

interface SubfolderItem {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
}

export const subfolderCache = new Map<string, SubfolderItem[]>();

interface FolderHoverCardProps {
  folderId: string;
  folderName: string;
  isOpen: boolean;
  onNavigate: (folderId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  position?: 'bottom' | 'right';
  anchorRect?: DOMRect | null;
}

export const FolderHoverCard: React.FC<FolderHoverCardProps> = ({
  folderId,
  folderName,
  isOpen,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
  position = 'bottom',
  anchorRect,
}) => {
  const [subfolders, setSubfolders] = useState<SubfolderItem[] | null>(() => {
    return subfolderCache.get(folderId) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const activeFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (subfolderCache.has(folderId)) {
      setSubfolders(subfolderCache.get(folderId)!);
      return;
    }

    setIsLoading(true);
    activeFetchRef.current = folderId;

    fetch(`${API_BASE_URL}/api/folders/${folderId}/subfolders`)
      .then((res) => {
        if (!res.ok) throw new Error('Subfolders fetch failed');
        return res.json();
      })
      .then((data: SubfolderItem[]) => {
        const list = Array.isArray(data) ? data : [];
        subfolderCache.set(folderId, list);
        if (activeFetchRef.current === folderId) {
          setSubfolders(list);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch subfolders for folder hover:', err);
        if (activeFetchRef.current === folderId) {
          setSubfolders([]);
        }
      })
      .finally(() => {
        if (activeFetchRef.current === folderId) {
          setIsLoading(false);
        }
      });
  }, [isOpen, folderId]);

  if (!isOpen) return null;

  const fixedStyle: React.CSSProperties | undefined = anchorRect
    ? {
        position: 'fixed',
        top: `${Math.max(12, Math.min(anchorRect.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 260))}px`,
        left: `${anchorRect.right + 8}px`,
        zIndex: 1100,
      }
    : undefined;

  return (
    <div 
      className={`folder-hover-card folder-hover-pos-${position}`}
      style={fixedStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="folder-hover-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <FolderTree size={13} className="folder-hover-icon-top" />
          <span className="folder-hover-title" title={folderName}>
            {folderName}
          </span>
        </div>
        {subfolders && (
          <span className="folder-hover-badge">
            {subfolders.length} {subfolders.length === 1 ? 'subfolder' : 'subfolders'}
          </span>
        )}
      </div>

      <div className="folder-hover-body">
        {isLoading ? (
          <div className="folder-hover-loading">
            <Loader2 size={14} className="spin-icon" />
            <span>Checking subfolders...</span>
          </div>
        ) : !subfolders || subfolders.length === 0 ? (
          <div className="folder-hover-empty">
            <span>No subfolders inside</span>
          </div>
        ) : (
          <div className="folder-hover-list">
            {subfolders.map((sf) => (
              <button
                key={sf.id}
                type="button"
                className="folder-hover-row"
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  onNavigate(sf.id);
                }}
                title={`Open "${sf.name}"`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <Folder size={14} className="folder-hover-row-icon" />
                  <span className="folder-hover-row-name">{sf.name}</span>
                </div>
                <ChevronRight size={12} className="folder-hover-row-arrow" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
