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

Since detection was built from a saved copy of the page (the real site
couldn't be reached directly), the default behavior clicks the empty **Art**
cell itself. If locking doesn't actually happen on the live site:

1. Open the popup and turn on **Dry run** first. This only highlights
   detected unlocked orders in orange without clicking anything — use it to
   confirm detection is correct before letting it click for real.
2. If clicking the Art cell doesn't lock the order, click **Pick element on
   page** in the popup, then click directly on the exact element/link that
   normally locks an order (e.g. a small "claim" link or icon inside that
   row). The extension records a selector and uses it from then on instead of
   the default cell click.
3. Click **Reset to default** any time to go back to clicking the Art cell.

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

## Notes

- Only one order is auto-locked per page load/search, to avoid accidentally
  grabbing multiple orders.
- If the site's markup differs from what's described here (e.g. a different
  column name or icon), open `extension/content.js` and adjust
  `getArtColumnIndex` / `isCellLocked` accordingly.
