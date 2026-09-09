// Handles the Ctrl+Shift+L global shortcut and keeps a toolbar badge in sync with auto-lock state.
const DEFAULTS = { autoLockEnabled: true };

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#2e7d32" : "#b71c1c" });
}

async function toggleAutoLock() {
  const { autoLockEnabled } = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ autoLockEnabled: !autoLockEnabled });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-auto-lock") toggleAutoLock();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.autoLockEnabled) {
    updateBadge(changes.autoLockEnabled.newValue);
  }
});

async function initBadge() {
  const { autoLockEnabled } = await chrome.storage.sync.get(DEFAULTS);
  updateBadge(autoLockEnabled);
}

chrome.runtime.onInstalled.addListener(initBadge);
chrome.runtime.onStartup.addListener(initBadge);
