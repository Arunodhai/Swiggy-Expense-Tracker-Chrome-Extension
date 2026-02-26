# Swiggy Expense Tracker (Chrome Extension)

A Manifest V3 Chrome extension that captures your Swiggy order history from the current page and renders a single-page analytics dashboard.

## Current Features

- One-click sync from popup: **Sync current Swiggy page**
- Captures order data from visible Swiggy order cards and stores locally
- Deduplicates imports using order ID/fingerprint merge logic
- Auto-inject fallback if content script is not attached (`Receiving end does not exist` case)
- Stores profile metadata (currently used: phone number)
- Dashboard-level period filter (year / all-time)

### Dashboard (single page)

- KPI cards:
  - Total spend
  - Total orders
  - Average order value
  - Active months
  - Most used restaurant
  - Most ordered item
- Visualizations:
  - **Monthly Spend** (bar chart, with hover tooltip)
  - **Spend by Restaurant** (donut chart, hover tooltip with spend)
  - **Busiest Ordering Days/Times** (heatmap with hover tooltip)
  - **Food Item Count** (horizontal bars with counts)
  - **Order Trend** (line chart with hover tooltip)
  - **Order Activity & Streak** (GitHub-style activity calendar + streak stats)

## Tech Stack

- Manifest V3
- Background service worker (`src/background.js`)
- Content script scraper (`src/content.js`)
- Popup UI (`src/popup.html`, `src/popup.js`)
- Canvas-based custom dashboard charts (`src/dashboard.js`)
- Local persistence via `chrome.storage.local`

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:
   - `/Users/arunodhaiv/Desktop/Swiggy Expense Tracker`

## Usage

1. Open Swiggy order history page (`https://www.swiggy.com/my-account/orders`)
2. Scroll down to load older orders (Swiggy lazy-loads)
3. Open extension popup
4. Click **Sync current Swiggy page**
5. Click **Open dashboard**
6. Use the year dropdown to filter all dashboard cards at once
7. Repeat sync after further scrolling to import more history

## Data Model (stored locally)

- Orders key: `swiggy_orders_v1`
- Profile key: `swiggy_profile_v1`
- Everything is stored in browser local storage only (`chrome.storage.local`)

## Permissions

- `storage`: persist orders/profile
- `tabs`: find active tab for sync
- `scripting`: inject content script fallback on demand
- Host permission: `https://www.swiggy.com/*`

## Troubleshooting

- **“Could not establish connection. Receiving end does not exist.”**
  - The extension now attempts script injection fallback automatically.
  - If it still appears: refresh Swiggy tab, then retry sync.
- **0 spend / missing totals**
  - Ensure the visible cards include `Total Paid`.
  - Scroll to load more orders and sync again.
- **Unexpected restaurant/name parsing**
  - Swiggy DOM is dynamic; parser uses heuristics and may need adjustment if page structure changes.

## Limitations

- Works only on data visible in your logged-in browser session.
- Depends on Swiggy’s DOM structure and labels.
- No cloud sync/export yet (local-only analytics).

## Project Structure

- `manifest.json` - extension config
- `src/background.js` - storage + message orchestration
- `src/content.js` - order/profile extraction
- `src/popup.*` - quick actions UI
- `src/dashboard.*` - analytics dashboard
