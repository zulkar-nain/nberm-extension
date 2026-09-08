const DEFAULTS = {
  autoLockEnabled: true,
  autoLockDryRun: false,
  autoLockCustomSelector: ""
};

const enabledEl = document.getElementById("enabled");
const dryRunEl = document.getElementById("dryRun");
const selectorValueEl = document.getElementById("selectorValue");
const pickBtn = document.getElementById("pickBtn");
const clearSelectorBtn = document.getElementById("clearSelectorBtn");
const rescanBtn = document.getElementById("rescanBtn");
const logEl = document.getElementById("log");
const updateBanner = document.getElementById("updateBanner");
const updateText = document.getElementById("updateText");
const updateViewBtn = document.getElementById("updateViewBtn");
const updateReloadBtn = document.getElementById("updateReloadBtn");

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    enabledEl.checked = cfg.autoLockEnabled;
    dryRunEl.checked = cfg.autoLockDryRun;
    selectorValueEl.textContent = cfg.autoLockCustomSelector || "default (Art cell)";
  });
}

function loadLog() {
  chrome.storage.local.get({ activityLog: [] }, (data) => {
    logEl.innerHTML = "";
    if (!data.activityLog.length) {
      const li = document.createElement("li");
      li.textContent = "No activity yet.";
      logEl.appendChild(li);
      return;
    }
    data.activityLog.forEach((entry) => {
      const li = document.createElement("li");
      const time = new Date(entry.time).toLocaleTimeString();
      li.innerHTML = `<span class="action">${entry.action}</span> ${entry.order ? "- " + entry.order : ""} <br>${time}`;
      logEl.appendChild(li);
    });
  });
}

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ autoLockEnabled: enabledEl.checked });
});

dryRunEl.addEventListener("change", () => {
  chrome.storage.sync.set({ autoLockDryRun: dryRunEl.checked });
});

clearSelectorBtn.addEventListener("click", () => {
  chrome.storage.sync.set({ autoLockCustomSelector: "" }, loadSettings);
});

pickBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: "start-picker" }, () => {
    window.close(); // let the user click the element on the page
  });
});

rescanBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: "rescan" });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.autoLockCustomSelector) {
    selectorValueEl.textContent = changes.autoLockCustomSelector.newValue || "default (Art cell)";
  }
  if (area === "local" && changes.activityLog) {
    loadLog();
  }
});

async function runUpdateCheck() {
  try {
    const result = await checkForUpdate();
    if (!result.updateAvailable) return;
    updateText.textContent = `Update available: v${result.currentVersion} → v${result.latestVersion}. ${result.notes}`;
    updateBanner.classList.remove("hide");
    updateViewBtn.onclick = () => chrome.tabs.create({ url: result.releaseUrl || "https://github.com/zulkar-nain/nberm-extension" });
    updateReloadBtn.onclick = () => chrome.runtime.reload();
  } catch (err) {
    console.warn("NBERM Auto Locker: update check failed", err);
  }
}

loadSettings();
loadLog();
runUpdateCheck();
