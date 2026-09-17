import React from 'react';
import { HardDrive, Folder, Plus, Heart, Search } from 'lucide-react';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface MobileBottomBarProps {
  currentTab: string;
  currentFolderId: string | null;
  onNavigateTab: (tab: string) => void;
  onOpenActionSheet: () => void;
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentTab,
  currentFolderId,
  onNavigateTab,
  onOpenActionSheet,
  onOpenSearch,
  onOpenSidebar,
}) => {
  const isFilesActive = currentTab === 'all' && !currentFolderId;
  const isFavoritesActive = currentTab === 'favorites' && !currentFolderId;

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      {/* 1. All Files */}
      <button 
        className={`mobile-bottom-nav-item ${isFilesActive ? 'active' : ''}`}
        onClick={() => {
          hapticLight();
          onNavigateTab('all');
        }}
        aria-label="All Files"
      >
        <HardDrive size={20} />
        <span className="mobile-bottom-nav-label">Files</span>
      </button>

      {/* 2. Folders Browser */}
      <button 
        className={`mobile-bottom-nav-item ${currentFolderId ? 'active' : ''}`}
        onClick={() => {
          hapticLight();
          onOpenSidebar();
        }}
        aria-label="Folders"
      >
        <Folder size={20} />
        <span className="mobile-bottom-nav-label">Folders</span>
      </button>

      {/* 3. Central FAB (+) Upload & Actions */}
      <div className="mobile-bottom-fab-wrap">
        <button 
          className="mobile-bottom-fab" 
          onClick={() => {
            hapticSelection();
            onOpenActionSheet();
          }}
          aria-label="Add or Upload"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* 4. Favorites */}
      <button 
        className={`mobile-bottom-nav-item ${isFavoritesActive ? 'active' : ''}`}
        onClick={() => {
          hapticLight();
          onNavigateTab('favorites');
        }}
        aria-label="Favorites"
      >
        <Heart size={20} fill={isFavoritesActive ? "currentColor" : "none"} />
        <span className="mobile-bottom-nav-label">Favorites</span>
      </button>

      {/* 5. Search */}
      <button 
        className="mobile-bottom-nav-item"
        onClick={() => {
          hapticLight();
          onOpenSearch();
        }}
        aria-label="Search"
      >
        <Search size={20} />
        <span className="mobile-bottom-nav-label">Search</span>
      </button>
    </nav>
  );
};
