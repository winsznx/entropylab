/**
 * Local persistence, backed by IndexedDB.
 *
 * IndexedDB rather than localStorage because a calibration session is an array
 * of thousands of observations and localStorage's string quota is reached
 * quickly. Nothing here leaves the browser: there is no sync, no account, and
 * no network call anywhere in this file.
 *
 * Every operation degrades to a no-op when storage is unavailable, which
 * happens in private windows and when site data is blocked. The application
 * must stay usable in that state, because someone profiling entropy for a seed
 * ceremony is exactly the sort of person browsing privately.
 */
export interface StoredProfile {
  id: string;
  name: string;
  sourceType: "d6" | "coin" | "custom";
  alphabetSize: number;
  labels: string[];
  collectionMethod: string;
  targetBits: number;
  notes: string;
  createdAt: number;
}

export interface StoredSession {
  id: string;
  profileId: string;
  observations: number[];
  source: string;
  createdAt: number;
}

const DB_NAME = "entropylab";
const DB_VERSION = 1;
const PROFILES = "profiles";
const SESSIONS = "sessions";

let available = true;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILES))
        db.createObjectStore(PROFILES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SESSIONS)) {
        const store = db.createObjectStore(SESSIONS, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb open failed"));
  });
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  if (!available || typeof indexedDB === "undefined") return null;
  try {
    const db = await openDatabase();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = run(tx.objectStore(store));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error("indexeddb request failed"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    // A blocked or unavailable store must not break the application; the user
    // simply loses persistence for this visit.
    available = false;
    return null;
  }
}

export const storage = {
  isAvailable: (): boolean => available && typeof indexedDB !== "undefined",

  async listProfiles(): Promise<StoredProfile[]> {
    const result = await withStore<StoredProfile[]>(PROFILES, "readonly", (s) => s.getAll());
    return (result ?? []).sort((a, b) => b.createdAt - a.createdAt);
  },

  async saveProfile(profile: StoredProfile): Promise<void> {
    await withStore(PROFILES, "readwrite", (s) => s.put(profile));
  },

  async deleteProfile(id: string): Promise<void> {
    await withStore(PROFILES, "readwrite", (s) => s.delete(id));
    const sessions = await this.listSessions(id);
    for (const session of sessions) await this.deleteSession(session.id);
  },

  async listSessions(profileId?: string): Promise<StoredSession[]> {
    const all = (await withStore<StoredSession[]>(SESSIONS, "readonly", (s) => s.getAll())) ?? [];
    const filtered = profileId ? all.filter((s) => s.profileId === profileId) : all;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },

  async saveSession(session: StoredSession): Promise<void> {
    await withStore(SESSIONS, "readwrite", (s) => s.put(session));
  },

  async deleteSession(id: string): Promise<void> {
    await withStore(SESSIONS, "readwrite", (s) => s.delete(id));
  },

  /** Removes everything this application has stored. */
  async clearAll(): Promise<void> {
    await withStore(PROFILES, "readwrite", (s) => s.clear());
    await withStore(SESSIONS, "readwrite", (s) => s.clear());
  },
};

export function newId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
