const DB_NAME = 'keepspace_local';
const DB_VERSION = 1;

export interface CachedVault {
  folder: any | null;
  breadcrumbs: any[];
  subfolders: any[];
  documents: any[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('vault_cache')) {
        db.createObjectStore('vault_cache');
      }
      if (!db.objectStoreNames.contains('stats')) {
        db.createObjectStore('stats');
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save dynamic cache for a specific folder path or tab key
export async function saveLocalVault(folderIdOrTab: string | null, data: CachedVault): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('vault_cache', 'readwrite');
    const store = tx.objectStore('vault_cache');
    const key = folderIdOrTab || 'root_all';
    store.put(data, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB write failed:", e);
  }
}

// Retrieve cached data for a specific folder path or tab key
export async function getLocalVault(folderIdOrTab: string | null): Promise<CachedVault | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('vault_cache', 'readonly');
    const store = tx.objectStore('vault_cache');
    const key = folderIdOrTab || 'root_all';
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB read failed:", e);
    return null;
  }
}

// Save stats cache
export async function saveLocalStats(stats: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    store.put(stats, 'current');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB stats write failed:", e);
  }
}

// Retrieve cached stats
export async function getLocalStats(): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const request = store.get('current');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB stats read failed:", e);
    return null;
  }
}
