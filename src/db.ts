import type { Collection, Post } from './types';

const DB_NAME = 'x-bookmark-shelf';
const STORE = 'posts';
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      if (event.oldVersion === 0) {
        db.createObjectStore(STORE, { keyPath: 'key' });
        return;
      }
      if (event.oldVersion < 2) {
        const oldStore = request.transaction!.objectStore(STORE);
        const oldRecords = oldStore.getAll();
        oldRecords.onsuccess = () => {
          const records = oldRecords.result as Array<Omit<Post, 'key' | 'source' | 'orderAt'>>;
          db.deleteObjectStore(STORE);
          const newStore = db.createObjectStore(STORE, { keyPath: 'key' });
          for (const post of records) newStore.put({ ...post, key: `bookmark:${post.id}`, source: 'bookmark', orderAt: -Date.parse(post.savedAt) });
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function insertUntilKnown(posts: Post[], eligibleKeys: Set<string>): Promise<{ saved: number; hitKnown: boolean }> {
  if (!posts.length) return { saved: 0, hitKnown: false };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    let index = 0;
    let saved = 0;
    let hitKnown = false;
    const next = () => {
      if (index >= posts.length) return;
      const post = posts[index++];
      const request = store.get(post.key);
      request.onsuccess = () => {
        if (request.result) { hitKnown = true; return; }
        if (eligibleKeys.has(post.key)) { store.add(post); saved++; }
        next();
      };
    };
    next();
    transaction.oncomplete = () => { db.close(); resolve({ saved, hitKnown }); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('SAVE_FAILED')); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function list(source: Collection): Promise<Post[]> {
  const db = await openDb();
  const posts = await new Promise<Post[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as Post[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return posts
    .filter(post => post.source === source || (source === 'bookmark' && !post.source));
}

export async function clearCollection(source: Collection): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    let removed = 0;
    const request = store.getAll() as IDBRequest<Post[]>;
    request.onsuccess = () => {
      for (const post of request.result) {
        if (post.source === source || (source === 'bookmark' && !post.source)) {
          store.delete(post.key);
          removed++;
        }
      }
    };
    transaction.oncomplete = () => { db.close(); resolve(removed); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('DELETE_FAILED')); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
