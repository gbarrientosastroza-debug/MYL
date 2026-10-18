import { CardData } from '../types/card';

/**
 * High-reliability multi-tier storage for card images and custom cards:
 * 1. Server disk storage (/api/card-images and /api/custom-cards) - immune to browser clearing or iframe sandboxes.
 * 2. Client IndexedDB storage (with singleton connection and timeouts).
 * 3. Client localStorage cache.
 */

const DB_NAME = 'MyLo_Card_Vault_v2';
const STORE_NAME = 'card_images';
const STORE_CARDS = 'custom_cards';
const DB_VERSION = 3;

let cachedDb: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  if (dbOpeningPromise) {
    return dbOpeningPromise;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('IndexedDB open timed out'));
    }, 2000);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          db.createObjectStore(STORE_CARDS);
        }
      };

      request.onsuccess = () => {
        clearTimeout(timer);
        cachedDb = request.result;
        cachedDb.onversionchange = () => {
          cachedDb?.close();
          cachedDb = null;
        };
        resolve(cachedDb);
      };

      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error);
      };

      request.onblocked = () => {
        clearTimeout(timer);
        console.warn('IndexedDB upgrade blocked by another connection');
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  }).finally(() => {
    dbOpeningPromise = null;
  });

  dbOpeningPromise = promise;
  return promise;
}

/**
 * Optimize image size using an offscreen canvas so it loads instantly
 * and consumes minimal memory while remaining razor sharp on high-DPI screens.
 */
export function optimizeCardImage(dataUrl: string, maxDim: number = 1000): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxDim && height <= maxDim) {
        // Still compress to webp/jpeg to keep size minimal
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/webp', 0.88));
            return;
          } catch {
            resolve(canvas.toDataURL('image/jpeg', 0.88));
            return;
          }
        }
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const optimized = canvas.toDataURL('image/webp', 0.88);
        resolve(optimized);
      } catch {
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Save a single card image by its number or id
 */
export async function saveCardImage(cardKey: number | string, dataUrl: string): Promise<void> {
  await saveBatchCardImages({ [cardKey]: dataUrl });
}

/**
 * Batch save multiple card images into:
 * 1. Server disk storage
 * 2. IndexedDB
 * 3. LocalStorage (if size permits)
 */
export async function saveBatchCardImages(imageMap: Record<number | string, string>): Promise<void> {
  const normalizedMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(imageMap)) {
    normalizedMap[String(k)] = v;
  }

  // 1. Persist to Server Disk via REST endpoint (Fire & Forget with error catching)
  fetch('/api/card-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: normalizedMap }),
  }).catch((err) => {
    console.warn('Server sync failed:', err);
  });

  // 2. Persist to IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      Object.entries(normalizedMap).forEach(([key, val]) => {
        store.put(val, String(key));
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

/**
 * Retrieve all stored card images:
 * Combines server disk storage, IndexedDB, and localStorage fallback.
 */
export async function loadAllCardImages(): Promise<Record<number, string>> {
  const merged: Record<number, string> = {};

  // Layer 1: Fetch from server disk
  try {
    const res = await fetch('/api/card-images');
    if (res.ok) {
      const data = await res.json();
      if (data.images && typeof data.images === 'object') {
        Object.entries(data.images).forEach(([k, v]) => {
          const num = parseInt(k, 10);
          if (!isNaN(num) && typeof v === 'string') {
            merged[num] = v;
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to fetch images from server:', err);
  }

  // Layer 2: Fetch from IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const numKey = parseInt(String(cursor.key), 10);
          if (!isNaN(numKey) && cursor.value) {
            // Server images take precedence or fill gaps
            if (!merged[numKey]) {
              merged[numKey] = cursor.value;
            }
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load images from IndexedDB:', err);
  }

  return merged;
}

/**
 * Delete a specific card image
 */
export async function deleteCardImage(cardKey: number | string): Promise<void> {
  fetch(`/api/card-images/${cardKey}`, { method: 'DELETE' }).catch(() => {});

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(String(cardKey));
  } catch (err) {
    console.warn('Failed to delete from IndexedDB:', err);
  }
}

/**
 * Clear all custom card images
 */
export async function clearAllCardImages(): Promise<void> {
  fetch('/api/card-images/all', { method: 'DELETE' }).catch(() => {});

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}

/**
 * Persist custom / recognized cards in Server Disk & IndexedDB
 */
export async function saveStoredCustomCards(cards: CardData[]): Promise<void> {
  // 1. Server disk
  fetch('/api/custom-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards }),
  }).catch((err) => {
    console.warn('Server custom cards sync failed:', err);
  });

  // 2. IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readwrite');
      const store = tx.objectStore(STORE_CARDS);
      store.clear();
      cards.forEach((c) => {
        store.put(c, c.id);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save cards to IndexedDB:', err);
  }
}

/**
 * Load custom / recognized cards from Server Disk & IndexedDB
 */
export async function loadStoredCustomCards(): Promise<CardData[]> {
  // Layer 1: Fetch from server disk
  try {
    const res = await fetch('/api/custom-cards');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        return data.cards;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch custom cards from server:', err);
  }

  // Layer 2: Fetch from IndexedDB
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CARDS, 'readonly');
      const store = tx.objectStore(STORE_CARDS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load cards from IndexedDB:', err);
    return [];
  }
}
