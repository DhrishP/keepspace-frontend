import React, { useMemo } from 'react';
import { Folder, ChevronRight, Check } from 'lucide-react';

export interface FolderItem {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface FolderWaveSelectorProps {
  folders: FolderItem[];
  selectedFolderId: string; // '' means root
  onChange: (folderId: string) => void;
  disabled?: boolean;
}

export const FolderWaveSelector: React.FC<FolderWaveSelectorProps> = ({
  folders,
  selectedFolderId,
  onChange,
  disabled = false,
}) => {
  // Map of folder id -> folder
  const folderMap = useMemo(() => {
    const map = new Map<string, FolderItem>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Compute ancestor path for a folder id (from root down to id)
  const getPathToFolder = (targetId: string): string[] => {
    if (!targetId || !folderMap.has(targetId)) return [];
    const path: string[] = [];
    const visited = new Set<string>();
    let curr: string | null | undefined = targetId;

    while (curr && folderMap.has(curr) && !visited.has(curr)) {
      visited.add(curr);
      path.unshift(curr);
      curr = folderMap.get(curr)?.parent_id;
    }
    return path;
  };

  // Current active path array [rootFolderId, subfolderId, subSubfolderId...]
  const activePath = useMemo(() => {
    return getPathToFolder(selectedFolderId);
  }, [selectedFolderId, folderMap]);

  // Group folders by parent_id ('root' for null/empty)
  const childrenByParent = useMemo(() => {
    const map = new Map<string, FolderItem[]>();
    folders.forEach((f) => {
      const pKey = f.parent_id || 'root';
      const existing = map.get(pKey) || [];
      existing.push(f);
      map.set(pKey, existing);
    });
    // Sort each group alphabetically
    map.forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [folders]);

  // Determine waves to display
  // Wave 0: Top level (parent_id = null or 'root')
  // Wave 1: Children of activePath[0], if activePath[0] has children
  // Wave 2: Children of activePath[1], if activePath[1] has children, etc.
  const waves = useMemo(() => {
    const result: Array<{
      level: number;
      label: string;
      parentId: string; // 'root' or folder id
      selectedId: string;
      options: FolderItem[];
      parentName?: string;
    }> = [];

    // Wave 1 (Top Level)
    const rootOptions = childrenByParent.get('root') || [];
    const wave0Selected = activePath.length > 0 ? activePath[0] : '';
    result.push({
      level: 1,
      label: 'Main Level',
      parentId: 'root',
      selectedId: wave0Selected,
      options: rootOptions,
    });

    // Subsequent waves
    for (let i = 0; i < activePath.length; i++) {
      const currentId = activePath[i];
      const children = childrenByParent.get(currentId) || [];
      if (children.length > 0) {
        const nextSelected = activePath.length > i + 1 ? activePath[i + 1] : currentId;
        const currentFolder = folderMap.get(currentId);
        result.push({
          level: i + 2,
          label: `Level ${i + 2}`,
          parentId: currentId,
          selectedId: nextSelected,
          options: children,
          parentName: currentFolder?.name || 'Folder',
        });
      }
    }

    return result;
  }, [activePath, childrenByParent, folderMap]);

  // Handle selection at wave index
  const handleWaveChange = (waveIndex: number, newId: string) => {
    if (waveIndex === 0) {
      // User changed top level
      onChange(newId);
    } else {
      // User changed sub-level wave
      onChange(newId);
    }
  };

  // Readable path breadcrumb text
  const breadcrumbNames = useMemo(() => {
    if (!selectedFolderId || !folderMap.has(selectedFolderId)) {
      return ['Root / Main Vault'];
    }
    const names = ['Root'];
    activePath.forEach((id) => {
      const f = folderMap.get(id);
      if (f) names.push(f.name);
    });
    return names;
  }, [selectedFolderId, activePath, folderMap]);

  return (
    <div className="folder-wave-selector">
      {/* Path preview pill */}
      <div className="folder-wave-summary">
        <span className="folder-wave-summary-label">Target:</span>
        <div className="folder-wave-summary-path">
          {breadcrumbNames.map((name, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={12} className="folder-wave-chevron" />}
              <span className={`folder-wave-crumb ${idx === breadcrumbNames.length - 1 ? 'active' : ''}`}>
                {idx === 0 ? '🏠 ' : '📁 '}
                {name}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Waves of Selection */}
      <div className="folder-waves-container">
        {waves.map((wave, idx) => {
          const isRootWave = idx === 0;

          return (
            <div key={`${wave.parentId}-${idx}`} className="folder-wave-row">
              <div className="folder-wave-header">
                <span className="folder-wave-level-badge">Wave {idx + 1}</span>
                <span className="folder-wave-level-name">
                  {isRootWave ? 'Choose Top-Level Directory' : `Inside "${wave.parentName}"`}
                </span>
              </div>

              <select
                className="form-input folder-wave-select"
                value={wave.selectedId}
                onChange={(e) => handleWaveChange(idx, e.target.value)}
                disabled={disabled}
              >
                {isRootWave ? (
                  <option value="">🏠 Main Vault (Root Level)</option>
                ) : (
                  <option value={wave.parentId}>
                    📁 Keep in current: "{wave.parentName}"
                  </option>
                )}
                {wave.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    📁 {opt.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};
