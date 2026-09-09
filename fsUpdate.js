// Lets the extension actually pull its own updated files from GitHub and write them to the
// unpacked extension folder on disk, using the File System Access API (no server involved).
const REPO_RAW_BASE = "https://raw.githubusercontent.com/zulkar-nain/nberm-extension/main/";
const FILES_TO_SYNC = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.css",
  "popup.js",
  "updateCheck.js",
  "fsUpdate.js",
  "version.json"
];

const DB_NAME = "nberm-updater";
const STORE_NAME = "handles";
const DIR_HANDLE_KEY = "extensionDir";

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getSavedDirHandle() {
  const db = await openHandleDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(DIR_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function saveDirHandle(handle) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, DIR_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Resolves to a writable handle for the unpacked extension folder, prompting the user
// to pick it only the first time (or again if permission was revoked).
async function ensureDirHandle() {
  let handle = await getSavedDirHandle();
  if (handle) {
    const existingPermission = await handle.queryPermission({ mode: "readwrite" });
    if (existingPermission === "granted") return handle;
    const requested = await handle.requestPermission({ mode: "readwrite" });
    if (requested === "granted") return handle;
  }
  handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await saveDirHandle(handle);
  return handle;
}

async function applyUpdate(onProgress) {
  const dirHandle = await ensureDirHandle();
  for (const file of FILES_TO_SYNC) {
    onProgress?.(`Downloading ${file}...`);
    const res = await fetch(REPO_RAW_BASE + file, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${file}: ${res.status}`);
    const content = await res.text();
    const fileHandle = await dirHandle.getFileHandle(file, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
  onProgress?.("Reloading extension...");
  chrome.runtime.reload();
}
