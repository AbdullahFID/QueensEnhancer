// Global shared helpers for all pages (residence, solus, …)
(() => {
  if (window.QE) return;

  // ---------- IndexedDB tiny wrapper ----------
  const DB_NAME = 'qe-cache';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');      // generic key/value
        if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages'); // page snapshots (optional)
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const idb = {
    async get(store, key) {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });
    },
    async set(store, key, value) {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    },
    async del(store, key) {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
  };

  // ---------- Cache helpers ----------
  const cache = {
    async get(key) {
      const rec = await idb.get('kv', key);
      if (!rec) return null;
      if (rec.exp && Date.now() > rec.exp) { await idb.del('kv', key); return null; }
      return rec.val;
    },
    async set(key, val, ttlMs) {
      const rec = { val, exp: ttlMs ? Date.now() + ttlMs : 0 };
      await idb.set('kv', key, rec);
    },
    async fetch(url, ttlMs = 60_000, fetchInit = {}) {
      const k = `fetch:${url}`;
      const hit = await cache.get(k);
      if (hit) return hit;
      const res = await fetch(url, fetchInit);
      const text = await res.text();
      await cache.set(k, text, ttlMs);
      return text;
    }
  };

  // ---------- chrome.storage convenience ----------
  const store = {
    get: (key, fallback) =>
      new Promise((res) => chrome?.storage?.local?.get(key, v => res((v || {})[key] ?? fallback))),
    set: (obj) =>
      new Promise((res) => chrome?.storage?.local?.set(obj, res))
  };

  // ---------- simple router ----------
  const routes = [];
  function register(testFn, initFn, name='') { routes.push({ testFn, initFn, name }); }

  async function start() {
    for (const r of routes) {
      try {
        if (r.testFn(location)) {
          await r.initFn();
          break;
        }
      } catch (e) { /* swallow — keep page safe */ }
    }
  }

  // ---------- small scheduler ----------
  const idle = (fn) =>
    ('requestIdleCallback' in window)
      ? window.requestIdleCallback(fn, { timeout: 1000 })
      : setTimeout(fn, 0);

  window.QE = { idb, cache, store, register, start, idle };
})();
