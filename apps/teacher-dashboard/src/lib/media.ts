import { demoMediaUrl, uploadDemo } from './demo-sync';
/**
 * Demo uploads are persisted by the opt-in demo server and shared with mobile.
 * IndexedDB retains a browser copy for the teacher's existing local library.
 * Bundled sample media continues to live under `/media/...`.
 */

const DB_NAME = 'ostadiplus-media';
const STORE = 'uploads';

interface StoredAsset {
  name: string;
  blob: Blob;
  kind: 'video' | 'pdf';
  sizeMb: number;
  durationSec: number;
  pages: number;
  addedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function putUpload(asset: StoredAsset): Promise<void> {
  await withStore('readwrite', (store) => store.put(asset) as IDBRequest);
}

export async function listUploads(): Promise<StoredAsset[]> {
  return withStore<StoredAsset[]>('readonly', (store) =>
    store.getAll() as IDBRequest<StoredAsset[]>,
  );
}

export async function getUpload(name: string): Promise<StoredAsset | undefined> {
  return withStore<StoredAsset | undefined>('readonly', (store) =>
    store.get(name) as IDBRequest<StoredAsset | undefined>,
  );
}

export async function removeUpload(name: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(name) as IDBRequest);
}

const objectUrls = new Map<string, string>();

/** Object URL for an uploaded file (cached per session). */
export async function uploadObjectUrl(name: string): Promise<string | null> {
  const cached = objectUrls.get(name);
  if (cached) return cached;
  const asset = await getUpload(name);
  if (!asset) return null;
  const url = URL.createObjectURL(asset.blob);
  objectUrls.set(name, url);
  return url;
}

/* ------------------------------------------------------------------ */
/* Upload helpers                                                      */
/* ------------------------------------------------------------------ */

export function readVideoDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (value: number) => {
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };
    video.onloadedmetadata = () => finish(Math.round(video.duration || 0));
    video.onerror = () => finish(0);
    setTimeout(() => finish(0), 4000);
    video.src = objectUrl;
  });
}

export function readPdfPages(file: File): Promise<number> {
  return file.text().then((text) => {
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 0;
  });
}

export interface PreparedUpload {
  name: string;
  kind: 'video' | 'pdf';
  sizeMb: number;
  durationSec: number;
  pages: number;
}

/** Read real metadata and persist the file. */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const kind: 'video' | 'pdf' = isPdf ? 'pdf' : 'video';
  const url = URL.createObjectURL(file);
  let durationSec = 0;
  let pages = 0;
  if (kind === 'video') durationSec = await readVideoDuration(url);
  else pages = await readPdfPages(file);
  URL.revokeObjectURL(url);

  const shared = await uploadDemo(file);
  const sharedName = shared.file;
  const asset: StoredAsset = {
    name: sharedName,
    blob: file,
    kind,
    sizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
    durationSec,
    pages,
    addedAt: new Date().toISOString(),
  };
  await putUpload(asset);
  objectUrls.set(sharedName, URL.createObjectURL(file));
  return {
    name: sharedName,
    kind,
    sizeMb: asset.sizeMb,
    durationSec,
    pages,
  };
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export type MediaKind = 'video' | 'poster' | 'doc';

export function bundledMediaUrl(kind: MediaKind, file: string): string {
  if (file.startsWith('/api/demo/') || /^https?:\/\//.test(file)) return demoMediaUrl(file);
  const folder = kind === 'video' ? 'videos' : kind === 'poster' ? 'posters' : 'docs';
  return `/media/${folder}/${file}`;
}

export function posterFileFor(videoFile: string): string {
  return videoFile.replace(/\.mp4$/i, '.jpg');
}
