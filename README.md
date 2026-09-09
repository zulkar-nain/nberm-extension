# NBERM Auto Order Locker

A Chrome extension that watches the order list on `nberm.com/administrator` and
automatically clicks the first unlocked order so it gets locked to you as soon
as the page loads.

## How it works

- The order table (`table.adminlist`) has a column labeled **Art**. When an
  order is locked, that cell shows an icon (e.g. the "checked out" image);
  when it's unlocked, the cell is empty.
- The content script finds the **Art** column by its header text (so it still
  works if columns get reordered), scans the rows top to bottom, and clicks
  the first empty **Art** cell it finds — only **one** order per page load, so
  it never mass-locks orders.
- It also watches the page with a `MutationObserver`, so if the table updates
  via AJAX (no full reload) it re-scans and can still catch a freshly
  unlocked order.

## Install (unpacked)

1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this repository's root folder (the one
   containing `manifest.json`).
4. Open the NBERM admin order page and click the extension icon to confirm
   settings.

## Important: verify the click target on the real site

The default behavior clicks the order's number link (`a.assignmentOrders`,
e.g. `W3813621A`) in the Order Number column, which is what actually opens
and locks the order. If that ever stops working on the live site (e.g. after
a site markup change):

1. Open the popup and turn on **Dry run** first. This only highlights
   detected unlocked orders in orange without clicking anything — use it to
   confirm detection is correct before letting it click for real.
2. If clicking the order number link doesn't lock the order, click **Pick
   element on page** in the popup, then click directly on the exact
   element/link that normally locks an order. The extension records a
   selector and uses it from then on instead of the default link click.
3. Click **Reset to default** any time to go back to clicking the order
   number link.

## Popup controls

- **Enable auto-lock** — turns the automatic click on/off.
- **Dry run** — highlights unlocked rows instead of clicking (safe testing
  mode).
- **Pick element on page** — lets you click the real lock control once, so
  future auto-locks reuse the exact same element.
- **Rescan current page now** — forces an immediate scan (useful after
  changing settings).
- **Activity log** — shows recent lock attempts and whether they were
  verified as successful.

## Update system (no server needed)

Since this is loaded unpacked (not from the Chrome Web Store), Chrome won't
auto-update it silently. Instead, every time you open the popup it checks
[`version.json`](version.json) on GitHub and shows a banner if a newer
version is available.

To ship an update:

1. Bump `"version"` in both `manifest.json` and `version.json` (keep them in
   sync) and describe the change in `version.json`'s `"notes"`.
2. Commit and push to `main`.
3. On the machine running the extension, open the popup and click
   **Update now (auto)**. This downloads the latest copy of every extension
   file straight from GitHub (`raw.githubusercontent.com`) and overwrites the
   local files in your unpacked extension folder using the browser's File
   System Access API, then calls `chrome.runtime.reload()` — no `git pull`,
   no visiting `chrome://extensions` manually.
   - The **first** time you click it, Chrome will ask you to pick a folder —
     choose the exact same folder you used for **Load unpacked**. That
     permission is remembered for next time.
   - If you'd rather update manually, you can still `git pull` yourself and
     reload from `chrome://extensions`.

If you ever want true silent/background auto-updates (not just a
banner + one click), the only real option is publishing the extension to the
Chrome Web Store (can be unlisted/private) — Chrome then updates it
automatically with no server of your own required.

## Notes

- Only one order is auto-locked per page load/search, to avoid accidentally
  grabbing multiple orders.
- If the site's markup differs from what's described here (e.g. a different
  column name or icon), open `extension/content.js` and adjust
  `getArtColumnIndex` / `isCellLocked` accordingly.
