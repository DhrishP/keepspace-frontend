import React, { useState } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { hapticSuccess } from '../utils/haptics';

interface BreadcrumbsProps {
  breadcrumbs: { id: string; name: string }[];
  setCurrentFolderId: (id: string | null) => void;
  onMoveItem?: (itemId: string, isFolderItem: boolean, targetFolderId: string | null) => void;
  onUploadFiles?: (files: FileList | File[], parentId?: string | null) => Promise<void>;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  breadcrumbs, 
  setCurrentFolderId,
  onMoveItem,
  onUploadFiles,
}) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDropOnTarget = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    // 1. External files from computer / Mac Finder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      hapticSuccess();
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
      hapticSuccess();
      if (onMoveItem) {
        onMoveItem(data.id, data.isFolder, targetId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="breadcrumbs-bar">
      <span 
        className={`breadcrumb-item ${dragOverId === 'root' ? 'breadcrumb-drop-active' : ''}`}
        onClick={() => setCurrentFolderId(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOverId('root');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (dragOverId === 'root') setDragOverId(null);
        }}
        onDrop={(e) => handleDropOnTarget(e, null)}
        title="Drop here to move or upload to Root directory"
      >
        <Home size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
        Root
      </span>
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        const isOverThisCrumb = dragOverId === crumb.id;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={14} className="breadcrumb-separator" />
            {isLast ? (
              <span className="breadcrumb-current">{crumb.name}</span>
            ) : (
              <span 
                className={`breadcrumb-item ${isOverThisCrumb ? 'breadcrumb-drop-active' : ''}`}
                onClick={() => setCurrentFolderId(crumb.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverId(crumb.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (dragOverId === crumb.id) setDragOverId(null);
                }}
                onDrop={(e) => handleDropOnTarget(e, crumb.id)}
                title={`Drop here to move or upload to "${crumb.name}"`}
              >
                {crumb.name}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
