import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  breadcrumbs: { id: string; name: string }[];
  setCurrentFolderId: (id: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, setCurrentFolderId }) => {
  return (
    <div className="breadcrumbs-bar">
      <span className="breadcrumb-item" onClick={() => setCurrentFolderId(null)}>
        <Home size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
        Root
      </span>
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={14} className="breadcrumb-separator" />
            {isLast ? (
              <span className="breadcrumb-current">{crumb.name}</span>
            ) : (
              <span className="breadcrumb-item" onClick={() => setCurrentFolderId(crumb.id)}>
                {crumb.name}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
