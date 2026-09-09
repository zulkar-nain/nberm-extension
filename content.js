// NBERM Auto Order Locker - content script
// Scans the admin "adminlist" order table for an unlocked order (empty "Art" cell,
// which normally shows a lock/"checked out" icon when an order is taken) and
// clicks it so the order gets locked before anyone else can grab it.
(function () {
  const DEFAULTS = {
    autoLockEnabled: true,
    autoLockDryRun: false,
    autoLockCustomSelector: ""
  };

  let hasAttemptedThisLoad = false;
  let pickerActive = false;
  let pickerHandler = null;

  function log(entry) {
    chrome.storage.local.get({ activityLog: [] }, (data) => {
      const list = data.activityLog || [];
      list.unshift({ ...entry, time: new Date().toISOString(), url: location.href });
      while (list.length > 50) list.pop();
      chrome.storage.local.set({ activityLog: list });
    });
  }

  // Finds the index of the "Art" column by reading the header row text,
  // so this keeps working even if the site reorders/adds columns.
  function getArtColumnIndex(table) {
    const headerRow = table.querySelector("tr");
    if (!headerRow) return -1;
    const headers = Array.from(headerRow.querySelectorAll("th"));
    return headers.findIndex((th) => th.textContent.trim().toLowerCase() === "art");
  }

  // A locked order shows the "checked_out" icon; an unlocked one shows no such icon
  // (it may still contain other icons, e.g. an attached-artwork picture icon).
  function isCellLocked(cell) {
    if (!cell) return true; // unknown state -> assume locked, never guess-click
    return !!cell.querySelector('img[src*="checked_out"]');
  }

  function getOrderLabel(row) {
    const link = row.querySelector('a.assignmentOrders, a[id^="assignmentOrder"]');
    return link ? link.textContent.trim() : row.id || "unknown";
  }

  function fireClick(target) {
    ["mousedown", "mouseup", "click"].forEach((type) => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
  }

  function scan() {
    chrome.storage.sync.get(DEFAULTS, (cfg) => {
      if (!cfg.autoLockEnabled && !cfg.autoLockDryRun) return;

      document.querySelectorAll("table.adminlist").forEach((table) => {
        const artIndex = getArtColumnIndex(table);
        if (artIndex === -1) return;

        const rows = table.querySelectorAll('tr[id^="row"]');
        for (const row of rows) {
          const cells = row.querySelectorAll("td");
          const artCell = cells[artIndex];
          if (!artCell) continue;

          if (isCellLocked(artCell)) {
            artCell.classList.remove("nberm-auto-lock-highlight");
            continue;
          }

          if (cfg.autoLockDryRun) {
            artCell.classList.add("nberm-auto-lock-highlight");
            continue; // dry run never clicks
          }

          if (hasAttemptedThisLoad) return; // only ever lock one order per page load

          hasAttemptedThisLoad = true;
          // Locking happens by opening the order via its order-number link, not the Art cell itself.
          const defaultTarget = row.querySelector("a.assignmentOrders") || artCell;
          const clickTarget = (cfg.autoLockCustomSelector && row.querySelector(cfg.autoLockCustomSelector)) || defaultTarget;
          fireClick(clickTarget);
          log({
            action: "lock-attempt",
            order: getOrderLabel(row),
            rowId: row.id,
            selectorUsed: cfg.autoLockCustomSelector || "default (order number link)"
          });

          // Confirm shortly after whether it actually locked, so failures are visible in the popup log.
          setTimeout(() => {
            if (!isCellLocked(artCell)) {
              log({ action: "lock-verify-failed", order: getOrderLabel(row), rowId: row.id });
            } else {
              log({ action: "lock-verified", order: getOrderLabel(row), rowId: row.id });
            }
          }, 1200);
          return;
        }
      });
    });
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  const debouncedScan = debounce(scan, 250);

  function buildSelector(el, row) {
    if (el === row) return "";
    let selector = el.tagName.toLowerCase();
    const cls = String(el.className || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(".");
    if (cls) selector += "." + cls;
    return selector;
  }

  function stopPicker() {
    if (!pickerActive) return;
    document.removeEventListener("click", pickerHandler, true);
    document.body.classList.remove("nberm-auto-lock-picking");
    pickerActive = false;
    pickerHandler = null;
  }

  function startPicker() {
    if (pickerActive) return;
    pickerActive = true;
    document.body.classList.add("nberm-auto-lock-picking");
    pickerHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const row = e.target.closest('tr[id^="row"]') || e.target.closest("tr");
      const selector = buildSelector(e.target, row);
      chrome.storage.sync.set({ autoLockCustomSelector: selector }, () => {
        log({ action: "picker-set", selectorUsed: selector || "(row itself)" });
      });
      stopPicker();
    };
    document.addEventListener("click", pickerHandler, true);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "start-picker") {
      startPicker();
      sendResponse({ ok: true });
    } else if (msg.type === "stop-picker") {
      stopPicker();
      sendResponse({ ok: true });
    } else if (msg.type === "rescan") {
      hasAttemptedThisLoad = false;
      scan();
      sendResponse({ ok: true });
    }
    return true;
  });

  function init() {
    scan();
    const observer = new MutationObserver(debouncedScan);
    observer.observe(document.body, { childList: true, subtree: true });

    // Reset the guard on Search clicks in case the table updates without a full navigation.
    document.addEventListener(
      "submit",
      () => {
        hasAttemptedThisLoad = false;
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
