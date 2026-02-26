const statTotalEl = document.getElementById("statTotal");
const statOrdersEl = document.getElementById("statOrders");
const statAvgEl = document.getElementById("statAvg");
const sparkMetaEl = document.getElementById("sparkMeta");
const sparkBarsEl = document.getElementById("sparkBars");
const sparkMonthsEl = document.getElementById("sparkMonths");
const topRestaurantEl = document.getElementById("topRestaurant");
const syncStateEl = document.getElementById("syncState");
const lastSyncEl = document.getElementById("lastSync");
const statusEl = document.getElementById("status");
const syncBtn = document.getElementById("syncBtn");
const dashboardBtn = document.getElementById("dashboardBtn");

function currency(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n || 0);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short" }).toUpperCase();
}

function cleanRestaurantLabel(name) {
  return String(name || "Unknown").replace(/\s+restaurant$/i, "").trim();
}

function formatRelative(iso) {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "unknown";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function buildRecentMonths(count = 7) {
  const out = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

function setSyncState(state, text) {
  syncStateEl.classList.remove("syncing", "error");
  if (state === "syncing") syncStateEl.classList.add("syncing");
  if (state === "error") syncStateEl.classList.add("error");
  syncStateEl.textContent = text;
}

function renderSparkline(orders) {
  const monthSpend = new Map();
  for (const order of orders) {
    const dt = order?.dateISO ? new Date(order.dateISO) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const key = monthKey(dt);
    monthSpend.set(key, (monthSpend.get(key) || 0) + (Number(order.amount) || 0));
  }

  const keys = buildRecentMonths(7);
  const values = keys.map((k) => monthSpend.get(k) || 0);
  const max = Math.max(...values, 1);

  sparkBarsEl.innerHTML = "";
  sparkMonthsEl.innerHTML = "";

  const currentKey = keys[keys.length - 1];
  const currentAmount = monthSpend.get(currentKey) || 0;
  sparkMetaEl.textContent = `${currency(currentAmount)} this month`;

  keys.forEach((k, i) => {
    const bar = document.createElement("span");
    bar.className = "spark-bar";
    if (k === currentKey) bar.classList.add("current");
    const pct = Math.max(4, Math.round((values[i] / max) * 100));
    bar.style.height = `${pct}%`;
    sparkBarsEl.appendChild(bar);

    const label = document.createElement("span");
    label.className = "spark-month";
    if (k === currentKey) label.classList.add("current");
    label.textContent = monthLabel(k);
    sparkMonthsEl.appendChild(label);
  });
}

function renderTopRestaurant(orders) {
  const usage = new Map();
  for (const order of orders) {
    const name = cleanRestaurantLabel(order.restaurant || "Unknown");
    usage.set(name, (usage.get(name) || 0) + 1);
  }
  const top = Array.from(usage.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top) {
    topRestaurantEl.textContent = "Top spot: NA - 0 orders";
    return;
  }
  topRestaurantEl.textContent = `Top spot: ${top[0]} - ${top[1]} orders`;
}

function getLastSyncedAt(orders) {
  let latest = 0;
  for (const order of orders) {
    const ts = order?.syncedAt ? new Date(order.syncedAt).getTime() : 0;
    if (ts > latest) latest = ts;
  }
  return latest ? new Date(latest).toISOString() : "";
}

async function loadSummary() {
  const data = await chrome.runtime.sendMessage({ type: "GET_ORDERS" });
  const orders = data?.orders || [];
  const total = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const avg = orders.length ? total / orders.length : 0;

  statTotalEl.textContent = currency(total);
  statOrdersEl.textContent = String(orders.length);
  statAvgEl.textContent = currency(avg);

  renderSparkline(orders);
  renderTopRestaurant(orders);

  const lastSyncedAt = getLastSyncedAt(orders);
  lastSyncEl.textContent = `Last synced ${formatRelative(lastSyncedAt)}`;
}

syncBtn.addEventListener("click", async () => {
  setSyncState("syncing", "Syncing");
  statusEl.textContent = "Syncing current tab...";

  const res = await chrome.runtime.sendMessage({ type: "TRIGGER_SYNC_ACTIVE_TAB" });
  if (!res?.ok) {
    setSyncState("error", "Error");
    statusEl.textContent = res?.error || "Sync failed.";
    return;
  }

  setSyncState("ready", "Synced");
  statusEl.textContent = `Synced ${res.extracted || 0} orders`;
  await loadSummary();
});

dashboardBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
});

loadSummary()
  .then(() => {
    setSyncState("ready", "Ready");
  })
  .catch(() => {
    setSyncState("error", "Error");
    statusEl.textContent = "Could not load stats.";
  });
