import React from 'react';

interface SkeletonLoaderProps {
  cardSize?: 'sm' | 'md' | 'lg';
  count?: number;
}

export const CardSkeleton: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  return (
    <div className={`card-item skeleton-card skeleton-card-${size}`}>
      <div className="card-icon-row">
        <div className="skeleton-box skeleton-icon" />
        <div style={{ display: 'flex', gap: '6px' }}>
          <div className="skeleton-box skeleton-action-btn" />
          <div className="skeleton-box skeleton-action-btn" />
        </div>
      </div>
      <div className="card-info" style={{ gap: '10px' }}>
        <div className="skeleton-box skeleton-text skeleton-title" />
        {size !== 'sm' && (
          <div className="skeleton-box skeleton-preview-box" />
        )}
        <div className="skeleton-box skeleton-text skeleton-meta" />
      </div>
    </div>
  );
};

export const FolderSkeleton: React.FC = () => {
  return (
    <div className="card-item skeleton-card skeleton-folder-card">
      <div className="card-icon-row">
        <div className="skeleton-box skeleton-icon" />
        <div className="skeleton-box skeleton-action-btn" />
      </div>
      <div className="card-info" style={{ gap: '8px' }}>
        <div className="skeleton-box skeleton-text skeleton-title" />
        <div className="skeleton-box skeleton-text skeleton-meta" style={{ width: '50%' }} />
      </div>
    </div>
  );
};

export const CardSkeletonGrid: React.FC<SkeletonLoaderProps> = ({ cardSize = 'md', count = 6 }) => {
  return (
    <div className={`items-grid grid-${cardSize}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} size={cardSize} />
      ))}
    </div>
  );
};

export const FolderSkeletonGrid: React.FC<SkeletonLoaderProps> = ({ cardSize = 'md', count = 3 }) => {
  return (
    <div className={`items-grid grid-${cardSize}`}>
      {Array.from({ length: count }).map((_, i) => (
        <FolderSkeleton key={i} />
      ))}
    </div>
  );
};

export const FolderViewSkeleton: React.FC<{ cardSize: 'sm' | 'md' | 'lg'; currentTab?: string }> = ({ cardSize, currentTab = 'all' }) => {
  const showFolders = currentTab === 'all';

  return (
    <div className="content-pane skeleton-container" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div className="section-header">
        <div className="skeleton-box skeleton-text" style={{ width: '160px', height: '22px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="skeleton-box" style={{ width: '84px', height: '32px', borderRadius: 'var(--border-radius-sm)' }} />
          <div className="skeleton-box" style={{ width: '96px', height: '32px', borderRadius: 'var(--border-radius-sm)' }} />
        </div>
      </div>

      {showFolders && (
        <div style={{ marginBottom: '20px' }}>
          <div className="skeleton-box skeleton-text" style={{ width: '80px', height: '12px', marginBottom: '12px' }} />
          <FolderSkeletonGrid cardSize={cardSize} count={3} />
        </div>
      )}

      <div>
        <div className="skeleton-box skeleton-text" style={{ width: '60px', height: '12px', marginBottom: '12px' }} />
        <CardSkeletonGrid cardSize={cardSize} count={6} />
      </div>
    </div>
  );
};

