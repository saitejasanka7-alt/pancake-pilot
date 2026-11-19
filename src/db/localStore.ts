import { createBaseDefaultDataset } from '../shared/demoSeed';
import type { AppMode, FinanceDataset } from '../shared/types';

const DB_NAME = 'pancakepilot_idb';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadDatasetFromLocal(storageKey: string): Promise<FinanceDataset | null> {
  const db = await openIdb();
  if (db) {
    try {
      const val = await new Promise<FinanceDataset | undefined>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(storageKey);
        req.onsuccess = () => resolve(req.result as FinanceDataset | undefined);
        req.onerror = () => resolve(undefined);
      });
      if (val && typeof val === 'object' && Array.isArray(val.transactions)) {
        return val;
      }
    } catch {
      // fall through to localStorage
    }
  }

  try {
    const raw = localStorage.getItem(`pp_ds_${storageKey}`);
    if (raw) return JSON.parse(raw) as FinanceDataset;
  } catch {
    // ignore
  }
  return null;
}

export async function saveDatasetToLocal(
  storageKey: string,
  dataset: FinanceDataset
): Promise<void> {
  try {
    localStorage.setItem(`pp_ds_${storageKey}`, JSON.stringify(dataset));
  } catch {
    // ignore quota issues
  }

  const db = await openIdb();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataset, storageKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}

export async function clearDatasetFromLocal(storageKey: string): Promise<void> {
  try {
    localStorage.removeItem(`pp_ds_${storageKey}`);
  } catch {
    // ignore
  }
  const db = await openIdb();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(storageKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}

const MODE_KEY = 'pancakepilot_mode';
const SESSION_TOKEN_KEY = 'pancakepilot_session_token';

export function getSavedAppMode(): AppMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'demo' || v === 'guest' || v === 'authenticated') return v;
  } catch {
    // ignore
  }
  return 'demo';
}

export function saveAppMode(mode: AppMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function getSavedSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function initOrLoadModeDataset(
  mode: AppMode,
  userId?: string
): Promise<FinanceDataset> {
  const key = mode === 'authenticated' && userId ? `auth_${userId}` : mode;
  const existing = await loadDatasetFromLocal(key);
  if (existing) return existing;

  const seeded = createBaseDefaultDataset(mode === 'demo' ? 'demo' : 'guest');
  await saveDatasetToLocal(key, seeded);
  return seeded;
}
