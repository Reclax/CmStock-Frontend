// Minimal IndexedDB helper for caching JSON arrays per endpoint
const DB_NAME = 'cmstock-offline-db';
const STORE_NAME = 'cache-store';
const DB_VERSION = 1;

const openDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const withStore = async (mode, callback) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('IDB transaction failed'));
  });
};

export const idbSet = async (key, value) => {
  await withStore('readwrite', (store) => store.put(value, key));
};

export const idbGet = async (key) =>
  await withStore('readonly', (store) => store.get(key));

export const idbDelete = async (key) =>
  await withStore('readwrite', (store) => store.delete(key));

export const idbClear = async () =>
  await withStore('readwrite', (store) => store.clear());

export const idbKeys = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
