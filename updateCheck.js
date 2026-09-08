// Checks GitHub for a newer version.json than the one baked into this extension's manifest.
// No server required - raw.githubusercontent.com serves the static file for free.
const VERSION_URL = "https://raw.githubusercontent.com/zulkar-nain/nberm-extension/main/version.json";

function compareVersions(a, b) {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function checkForUpdate() {
  const currentVersion = chrome.runtime.getManifest().version;
  const res = await fetch(VERSION_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Update check failed: ${res.status}`);
  const remote = await res.json();
  return {
    currentVersion,
    latestVersion: remote.version,
    notes: remote.notes || "",
    releaseUrl: remote.releaseUrl || "",
    updateAvailable: compareVersions(remote.version, currentVersion) > 0
  };
}
