const subtitleEl = document.getElementById("subtitle");
const totalEl = document.getElementById("kpiTotal");
const ordersEl = document.getElementById("kpiOrders");
const avgEl = document.getElementById("kpiAvg");
const monthsEl = document.getElementById("kpiMonths");
const totalMetaEl = document.getElementById("kpiTotalMeta");
const ordersMetaEl = document.getElementById("kpiOrdersMeta");
const avgMetaEl = document.getElementById("kpiAvgMeta");
const monthsMetaEl = document.getElementById("kpiMonthsMeta");
const topRestaurantEl = document.getElementById("kpiTopRestaurant");
const topRestaurantMetaEl = document.getElementById("kpiTopRestaurantMeta");
const topItemEl = document.getElementById("kpiTopItem");
const topItemMetaEl = document.getElementById("kpiTopItemMeta");
const profilePhoneTextEl = document.getElementById("profilePhoneText");
const monthLabelsEl = document.getElementById("monthLabels");
const orderCalendarGridEl = document.getElementById("orderCalendarGrid");
const calendarInsightEl = document.getElementById("calendarInsight");
const totalOrderDaysEl = document.getElementById("totalOrderDays");
const longestStreakEl = document.getElementById("longestStreak");
const currentStreakEl = document.getElementById("currentStreak");
const refreshBtn = document.getElementById("refreshBtn");
const yearSelectEl = document.getElementById("globalYearSelect");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const dashboardGridEl = document.getElementById("dashboardGrid");
const radialDaySelectEl = document.getElementById("radialDaySelect");

const monthlyCanvas = document.getElementById("monthlyChart");
const restaurantCanvas = document.getElementById("restaurantChart");
const heatmapCanvas = document.getElementById("heatmapChart");
const itemCountCanvas = document.getElementById("itemCountChart");
const trendCanvas = document.getElementById("trendChart");

const chartTooltipEl = document.createElement("div");
chartTooltipEl.id = "chartTooltip";
document.body.appendChild(chartTooltipEl);

let donutSegments = [];
let monthlyBarRegions = [];
let heatmapRegions = [];
let itemBarRegions = [];
let trendPointRegions = [];
let latestOrders = [];
let selectedYear = "all";
let selectedRadialDay = "All";
let radialHoverHour = null;
let radialHourlyByDay = null;
let chartAnimationFrame = 0;
const THEME_STORAGE_KEY = "swiggy_dashboard_theme_v1";
const CARD_ORDER_STORAGE_KEY = "swiggy_dashboard_card_order_v1";
const USE_MOCK_DEMO_DATA = true;
const DEMO_PHONE = "9567641577";
let mockOrdersCache = null;

function buildMockOrders() {
  if (mockOrdersCache) return mockOrdersCache;

  const reference = new Date("2026-02-27T20:30:00");
  const restaurants = [
    "Stories De Cafe",
    "Nalla Bhoomi Restaurant",
    "Arabian Grill Hub",
    "Wok Dynasty",
    "Pizza Yard"
  ];
  const itemPool = [
    "Porotta x 2, Paneer Chilly x 1",
    "Nool Porotta x 2, Kuboos x 1",
    "Chicken Shawarma x 2, Kuboos x 2",
    "Fried Rice x 1, Chilli Chicken x 1",
    "Margherita Pizza x 1, Garlic Bread x 1",
    "Beef Fry x 1, Porotta x 2",
    "Kunafa x 1, Falafel Wrap x 1"
  ];
  const monthPlan = [
    { offset: 11, count: 6, base: 390 },
    { offset: 10, count: 5, base: 340 },
    { offset: 9, count: 8, base: 430 },
    { offset: 8, count: 7, base: 380 },
    { offset: 7, count: 6, base: 410 },
    { offset: 6, count: 9, base: 520 },
    { offset: 5, count: 7, base: 460 },
    { offset: 4, count: 6, base: 400 },
    { offset: 3, count: 8, base: 490 },
    { offset: 2, count: 7, base: 445 },
    { offset: 1, count: 6, base: 420 },
    { offset: 0, count: 9, base: 510 }
  ];
  const hours = [20, 19, 21, 13, 18, 22, 15, 12, 20];

  const orders = [];
  let id = 1;
  monthPlan.forEach((plan, mIdx) => {
    for (let i = 0; i < plan.count; i += 1) {
      const dt = new Date(reference);
      dt.setMonth(dt.getMonth() - plan.offset);
      dt.setDate(((i * 3 + mIdx * 2) % 26) + 1);
      dt.setHours(hours[(i + mIdx) % hours.length], (i * 11) % 60, 0, 0);

      const restIdx = (i + mIdx * 2 + (i % 3 === 0 ? 0 : 1)) % restaurants.length;
      const restaurant = restaurants[restIdx];
      const items = [itemPool[(i + mIdx + (restIdx % 2)) % itemPool.length]];
      const amount = plan.base + ((i * 57 + mIdx * 41) % 290);

      orders.push({
        source: "swiggy",
        orderId: `DEMO-${String(id).padStart(4, "0")}`,
        restaurant,
        amount,
        dateISO: dt.toISOString(),
        status: "delivered",
        items,
        syncedAt: new Date("2026-02-27T21:00:00").toISOString()
      });
      id += 1;

      // Add occasional same-day extra orders so calendar intensity reaches darker levels.
      const burst = ((i + mIdx) % 5 === 0 ? 1 : 0) + ((i + mIdx) % 11 === 0 ? 1 : 0);
      for (let b = 0; b < burst; b += 1) {
        const extraDt = new Date(dt);
        extraDt.setMinutes(extraDt.getMinutes() + 20 + b * 17);
        const extraAmount = amount + 90 + b * 35;
        orders.push({
          source: "swiggy",
          orderId: `DEMO-${String(id).padStart(4, "0")}`,
          restaurant: restaurants[(restIdx + b + 1) % restaurants.length],
          amount: extraAmount,
          dateISO: extraDt.toISOString(),
          status: "delivered",
          items: [itemPool[(i + mIdx + b + 1) % itemPool.length]],
          syncedAt: new Date("2026-02-27T21:00:00").toISOString()
        });
        id += 1;
      }
    }
  });

  mockOrdersCache = orders.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  return mockOrdersCache;
}

function isDarkTheme() {
  return document.body.dataset.theme === "dark";
}

function getThemeColors() {
  return isDarkTheme()
    ? {
        axis: "rgba(255,255,255,0.18)",
        label: "#cbd5e1",
        chartBarBg: "#1d2430",
        line: "#f2f5f8",
        donutLabel: "#dbe3ee",
        itemLabel: "#d2dae6",
        valueLabel: "#d2dae6",
        monthlyBar: "#f2f5f8",
        trendLine: "#f2f5f8",
        itemBar: "#ff6a2b",
        heatText: "#f2f5f8",
        heatBaseLightness: 18,
        heatRange: 44
      }
    : {
        axis: "rgba(0,0,0,0.08)",
        label: "#4b5563",
        chartBarBg: "#f3f4f6",
        line: "#111111",
        donutLabel: "#334155",
        itemLabel: "#374151",
        valueLabel: "#374151",
        monthlyBar: "#111111",
        trendLine: "#111111",
        itemBar: "#ff6a2b",
        heatText: "#000000",
        heatBaseLightness: 96,
        heatRange: -44
      };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function heatGradientColor(t) {
  const stops = ["#070a1a", "#251443", "#4d1c66", "#8b1f77", "#c2185b", "#ef4444", "#f97316", "#f6d6b8"];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.floor(scaled);
  const next = Math.min(stops.length - 1, idx + 1);
  const localT = scaled - idx;
  const c1 = hexToRgb(stops[idx]);
  const c2 = hexToRgb(stops[next]);
  const r = Math.round(lerp(c1.r, c2.r, localT));
  const g = Math.round(lerp(c1.g, c2.g, localT));
  const b = Math.round(lerp(c1.b, c2.b, localT));
  return `rgb(${r}, ${g}, ${b})`;
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = next;
  localStorage.setItem(THEME_STORAGE_KEY, next);
  const isDark = next === "dark";
  themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  themeToggleBtn.setAttribute("aria-label", isDark ? "Disable dark mode" : "Enable dark mode");
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved || "light");
}

function initRadialDayOptions() {
  if (!radialDaySelectEl) return;
  const days = ["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  radialDaySelectEl.innerHTML = "";
  days.forEach((day) => {
    const opt = document.createElement("option");
    opt.value = day;
    opt.textContent = day;
    radialDaySelectEl.appendChild(opt);
  });
  radialDaySelectEl.value = selectedRadialDay;
}

function saveCardOrder() {
  if (!dashboardGridEl) return;
  const order = Array.from(dashboardGridEl.querySelectorAll(".panel"))
    .map((el) => el.dataset.cardKey)
    .filter(Boolean);
  localStorage.setItem(CARD_ORDER_STORAGE_KEY, JSON.stringify(order));
}

function applySavedCardOrder() {
  if (!dashboardGridEl) return;
  const raw = localStorage.getItem(CARD_ORDER_STORAGE_KEY);
  if (!raw) return;
  let order = [];
  try {
    order = JSON.parse(raw);
  } catch (_err) {
    return;
  }
  if (!Array.isArray(order) || !order.length) return;

  const panelMap = new Map(
    Array.from(dashboardGridEl.querySelectorAll(".panel"))
      .map((el) => [el.dataset.cardKey, el])
      .filter(([key]) => Boolean(key))
  );

  order.forEach((key) => {
    const panel = panelMap.get(key);
    if (panel) dashboardGridEl.appendChild(panel);
  });
}

function clearDragIndicators() {
  if (!dashboardGridEl) return;
  dashboardGridEl.querySelectorAll(".panel.drag-over").forEach((el) => el.classList.remove("drag-over"));
}

function getClosestDropTarget(clientX, clientY, draggingEl) {
  const panels = Array.from(dashboardGridEl.querySelectorAll(".panel")).filter((el) => el !== draggingEl);
  let best = null;
  let bestDist = Infinity;
  panels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = panel;
    }
  });
  return best;
}

function initCardReorder() {
  if (!dashboardGridEl) return;
  applySavedCardOrder();

  dashboardGridEl.querySelectorAll(".panel").forEach((panel) => {
    panel.setAttribute("draggable", "true");

    panel.addEventListener("dragstart", () => {
      panel.classList.add("dragging");
      clearDragIndicators();
    });

    panel.addEventListener("dragend", () => {
      panel.classList.remove("dragging");
      clearDragIndicators();
      saveCardOrder();
      refreshFromStorage().catch(() => {});
    });
  });

  dashboardGridEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    const draggingEl = dashboardGridEl.querySelector(".panel.dragging");
    if (!draggingEl) return;
    const target = getClosestDropTarget(event.clientX, event.clientY, draggingEl);
    clearDragIndicators();
    if (!target || target === draggingEl) return;
    target.classList.add("drag-over");
  });

  dashboardGridEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggingEl = dashboardGridEl.querySelector(".panel.dragging");
    if (!draggingEl) return;
    const target = getClosestDropTarget(event.clientX, event.clientY, draggingEl);
    if (!target || target === draggingEl) return;

    const rect = target.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    if (before) {
      dashboardGridEl.insertBefore(draggingEl, target);
    } else {
      dashboardGridEl.insertBefore(draggingEl, target.nextSibling);
    }
    clearDragIndicators();
  });
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCharts(drawFrame, duration = 720) {
  if (chartAnimationFrame) {
    cancelAnimationFrame(chartAnimationFrame);
    chartAnimationFrame = 0;
  }

  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const raw = Math.min(1, elapsed / duration);
    drawFrame(easeOutCubic(raw));
    if (raw < 1) {
      chartAnimationFrame = requestAnimationFrame(tick);
    } else {
      chartAnimationFrame = 0;
    }
  };

  chartAnimationFrame = requestAnimationFrame(tick);
}

function currency(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n || 0);
}

function monthKey(dateISO) {
  const dt = dateISO ? new Date(dateISO) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "Unknown";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (key === "Unknown") return key;
  const [year, month] = key.split("-").map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

function orderYear(dateISO) {
  const dt = dateISO ? new Date(dateISO) : null;
  if (!dt || Number.isNaN(dt.getTime())) return null;
  return String(dt.getFullYear());
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(monthKeyValue) {
  const [y, m] = String(monthKeyValue).split("-").map(Number);
  if (!y || !m) return null;
  const dt = new Date(y, m - 2, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function getDeltaMeta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { cls: "flat", text: "→ 0%" };
  if (previous === 0) {
    if (current === 0) return { cls: "flat", text: "→ 0%" };
    return { cls: "up", text: "↑ new" };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.1) return { cls: "flat", text: "→ 0%" };
  const rounded = Math.round(Math.abs(pct));
  return pct >= 0 ? { cls: "up", text: `↑ ${rounded}%` } : { cls: "down", text: `↓ ${rounded}%` };
}

function setKpiMetaWithDelta(el, text, delta) {
  el.classList.add("has-delta");
  el.innerHTML = `<span class="kpi-meta-text">${text}</span><span class="kpi-delta ${delta.cls}">${delta.text}</span>`;
}

function groupBy(arr, keyFn, valueFn = (x) => x) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    const val = valueFn(item);
    map.set(key, (map.get(key) || 0) + val);
  }
  return map;
}

function cleanRestaurantLabel(name) {
  return String(name || "Unknown").replace(/\s+restaurant$/i, "").trim();
}

function cleanProfileName(name) {
  const text = String(name || "").trim();
  if (!text) return "";
  if (/edit profile/i.test(text)) return "";
  return text;
}

function topEntry(map) {
  const entries = Array.from(map.entries());
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0];
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function normalizeItemName(name) {
  return name.replace(/\s+/g, " ").replace(/[|]/g, "").trim();
}

function parseItemLine(line) {
  const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return [];

  const parsed = [];
  for (const part of parts) {
    let match = part.match(/^(.*?)\s*x\s*(\d+)$/i);
    if (match) {
      parsed.push({ name: normalizeItemName(match[1]), qty: Number(match[2]) });
      continue;
    }

    match = part.match(/^(\d+)\s*x\s*(.*?)$/i);
    if (match) {
      parsed.push({ name: normalizeItemName(match[2]), qty: Number(match[1]) });
      continue;
    }

    parsed.push({ name: normalizeItemName(part), qty: 1 });
  }
  return parsed.filter((it) => it.name);
}

function inferCuisine(itemName) {
  const n = itemName.toLowerCase();
  if (/(biryani|tandoori|paneer|roti|naan|parotta|porotta|masala|curry|thali|chicken curry)/.test(n)) {
    return "Indian";
  }
  if (/(noodle|noodles|fried rice|manchurian|chilli|schezwan|hakka|momo|dimsum|wok)/.test(n)) {
    return "Chinese";
  }
  if (/(pizza|pasta|lasagna|garlic bread)/.test(n)) return "Italian";
  if (/(burger|fries|sandwich|wrap|hot dog)/.test(n)) return "Fast Food";
  if (/(shawarma|kebab|al\s*faham|alfaham|mandi|hummus|falafel|arabic|khubz|kuboos)/.test(n)) {
    return "Arabic";
  }
  if (/(dosa|idli|sambar|uttapam|upma|vada)/.test(n)) return "South Indian";
  if (/(cake|brownie|ice cream|dessert|sweet|kunafa|pastry)/.test(n)) return "Desserts";
  if (/(juice|shake|tea|coffee|mojito|drink)/.test(n)) return "Beverages";
  return "Other";
}

function aggregateItems(orders) {
  const itemCount = new Map();
  for (const order of orders) {
    const lines = Array.isArray(order.items) ? order.items : [];
    for (const line of lines) {
      for (const item of parseItemLine(line)) {
        itemCount.set(item.name, (itemCount.get(item.name) || 0) + item.qty);
      }
    }
  }
  return itemCount;
}

function computeStreaks(orders) {
  const uniqueDays = new Set();
  for (const o of orders) {
    const dt = o.dateISO ? new Date(o.dateISO) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    uniqueDays.add(`${y}-${m}-${d}`);
  }

  const dayList = Array.from(uniqueDays)
    .map((s) => new Date(`${s}T00:00:00`))
    .sort((a, b) => a - b);

  if (!dayList.length) return { longest: 0, recent: 0 };

  let longest = 1;
  let running = 1;
  for (let i = 1; i < dayList.length; i += 1) {
    const diff = (dayList[i] - dayList[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) running += 1;
    else running = 1;
    if (running > longest) longest = running;
  }

  let recent = 1;
  for (let i = dayList.length - 1; i > 0; i -= 1) {
    const diff = (dayList[i] - dayList[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) recent += 1;
    else break;
  }

  return { longest, recent };
}

function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function showTooltip(text, clientX, clientY) {
  chartTooltipEl.textContent = text;
  chartTooltipEl.style.left = `${clientX + 12}px`;
  chartTooltipEl.style.top = `${clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function renderActivityCalendar(orders, animate = false) {
  monthLabelsEl.innerHTML = "";
  orderCalendarGridEl.innerHTML = "";

  const dayCounts = new Map();
  for (const order of orders) {
    const dt = order.dateISO ? new Date(order.dateISO) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const key = ymd(dt);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const endDow = end.getDay();
  end.setDate(end.getDate() + (6 - endDow));

  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  const startDow = start.getDay();
  start.setDate(start.getDate() - startDow);

  const weeks = [];
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);
  for (let w = 0; w < totalWeeks; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      week.push(date);
    }
    weeks.push(week);
  }

  const sampleCell = document.createElement("div");
  sampleCell.className = "day-cell";
  sampleCell.style.visibility = "hidden";
  sampleCell.style.position = "absolute";
  document.body.appendChild(sampleCell);
  const cellSize = sampleCell.getBoundingClientRect().width || 13;
  document.body.removeChild(sampleCell);
  const cellGap = 3;
  const colStep = cellSize + cellGap;

  const calendarWidth = totalWeeks * colStep;
  monthLabelsEl.style.minWidth = `${calendarWidth}px`;
  orderCalendarGridEl.style.minWidth = `${calendarWidth}px`;
  weeks.forEach((week, i) => {
    const monthStart = week.find((d) => d.getDate() === 1 && d <= today);
    if (!monthStart && i !== 0) return;

    const label = document.createElement("span");
    label.className = "month-label";
    const labelMonth = monthStart || week[0];
    label.textContent = labelMonth.toLocaleString("en-IN", { month: "short" }).toUpperCase();
    label.style.left = `${i * colStep}px`;
    monthLabelsEl.appendChild(label);
  });

  weeks.forEach((week, weekIdx) => {
    const col = document.createElement("div");
    col.className = "week-col";
    week.forEach((date, dayIdx) => {
      const key = ymd(date);
      const count = dayCounts.get(key) || 0;
      const isFuture = date > today;
      const level = count >= 4 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0;
      const cell = document.createElement("div");
      cell.className = `day-cell ${isFuture ? "lvl-0" : `lvl-${level}`}`;
      if (animate) {
        cell.classList.add("cell-enter");
        cell.style.animationDelay = `${Math.min(420, weekIdx * 7 + dayIdx * 16)}ms`;
      }
      cell.addEventListener("mouseenter", (e) => {
        showTooltip(
          `${count} order${count === 1 ? "" : "s"} - ${date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
          })}`,
          e.clientX,
          e.clientY
        );
      });
      cell.addEventListener("mousemove", (e) => showTooltip(chartTooltipEl.textContent, e.clientX, e.clientY));
      cell.addEventListener("mouseleave", hideTooltip);
      col.appendChild(cell);
    });
    orderCalendarGridEl.appendChild(col);
  });

  const orderedDays = Array.from(dayCounts.entries()).filter(([, c]) => c > 0).length;
  const streaks = computeStreaks(orders);
  totalOrderDaysEl.textContent = String(orderedDays);
  longestStreakEl.textContent = `${streaks.longest}d`;
  currentStreakEl.textContent = `${streaks.recent}d`;

  const monthActiveDays = new Map();
  for (const week of weeks) {
    for (const d of week) {
      if (d > today) continue;
      const key = ymd(d);
      if ((dayCounts.get(key) || 0) <= 0) continue;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      monthActiveDays.set(mk, (monthActiveDays.get(mk) || 0) + 1);
    }
  }
  const topMonth = Array.from(monthActiveDays.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topMonth) {
    const [yearMonth, c] = topMonth;
    const [y, m] = yearMonth.split("-").map(Number);
    const label = new Date(y, m, 1).toLocaleString("en-IN", { month: "short" });
    calendarInsightEl.textContent = `You ordered most in ${label} with ${c} active days.`;
  } else {
    calendarInsightEl.textContent = "No order activity yet.";
  }

  const shell = orderCalendarGridEl.closest(".calendar-shell");
  if (shell) shell.scrollLeft = shell.scrollWidth;
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBarChart(canvas, labels, values, color, progress = 1) {
  const theme = getThemeColors();
  const { ctx, w, h } = setupCanvas(canvas);
  clearCanvas(ctx, canvas);
  monthlyBarRegions = [];
  const max = Math.max(...values, 1);
  const left = 24;
  const right = 16;
  const chartHeight = Math.max(90, h * 0.72);
  const chartTop = (h - chartHeight) / 2;
  const chartBottom = chartTop + chartHeight;
  const band = (w - left - right) / Math.max(labels.length, 1);
  const labelStep = Math.max(1, Math.ceil(labels.length / 7));
  const minLabelGap = 52;
  const labelIndexes = [];

  for (let i = 0; i < labels.length; i += 1) {
    if (i % labelStep === 0) labelIndexes.push(i);
  }
  if (!labelIndexes.includes(labels.length - 1)) {
    labelIndexes.push(labels.length - 1);
  }
  if (labelIndexes.length >= 2) {
    const lastIdx = labelIndexes[labelIndexes.length - 1];
    const prevIdx = labelIndexes[labelIndexes.length - 2];
    const lastX = left + lastIdx * band + band * 0.5;
    const prevX = left + prevIdx * band + band * 0.5;
    if (lastX - prevX < minLabelGap) {
      labelIndexes.splice(labelIndexes.length - 2, 1);
    }
  }
  const labelIndexSet = new Set(labelIndexes);

  ctx.strokeStyle = theme.axis;
  ctx.beginPath();
  ctx.moveTo(left, chartBottom);
  ctx.lineTo(w - right, chartBottom);
  ctx.stroke();

  labels.forEach((label, i) => {
    const x = left + i * band + band * 0.15;
    const bw = band * 0.7;
    const vh = ((chartHeight * values[i]) / max) * progress;
    const y = chartBottom - vh;

    const barColor = Array.isArray(color) ? color[i % color.length] : color;
    if (barColor && typeof barColor === "object" && barColor.type === "outline") {
      ctx.strokeStyle = barColor.stroke || "#ff6a2b";
      ctx.lineWidth = Math.max(1.5, bw * 0.06);
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, bw - 1), Math.max(0, vh - 1));
    } else {
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, bw, vh);
    }

    if (labelIndexSet.has(i)) {
      ctx.fillStyle = theme.label;
      ctx.font = "11px sans-serif";
      if (i === labels.length - 1) {
        ctx.textAlign = "right";
        ctx.fillText(label, w - right, chartBottom + 14);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(label, x + bw / 2, chartBottom + 14);
      }
    }

    if (canvas === monthlyCanvas) {
      monthlyBarRegions.push({
        x,
        y,
        w: bw,
        h: vh,
        label,
        value: values[i]
      });
    }
  });
}

function drawLineChart(canvas, labels, values, color, progress = 1) {
  const theme = getThemeColors();
  const { ctx, w, h } = setupCanvas(canvas);
  clearCanvas(ctx, canvas);
  if (canvas === trendCanvas) trendPointRegions = [];
  const left = 24;
  const right = 16;
  const chartHeight = Math.max(95, h * 0.74);
  const chartTop = (h - chartHeight) / 2;
  const chartBottom = chartTop + chartHeight;
  const max = Math.max(...values, 1);
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  const minLabelGap = 52;

  ctx.strokeStyle = theme.axis;
  ctx.beginPath();
  ctx.moveTo(left, chartBottom);
  ctx.lineTo(w - right, chartBottom);
  ctx.stroke();

  const points = labels.map((label, i) => {
    const x = left + (i * (w - left - right)) / Math.max(labels.length - 1, 1);
    const y = chartBottom - ((chartHeight * values[i]) / max) * progress;
    return { x, y, label, value: values[i] };
  });

  if (canvas === trendCanvas) {
    trendPointRegions = points.map((pt) => ({ x: pt.x, y: pt.y, label: pt.label, value: pt.value }));
  }

  if (points.length) {
    const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    grad.addColorStop(0, "rgba(255,106,43,0.34)");
    grad.addColorStop(1, "rgba(255,106,43,0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, chartBottom);
    points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, chartBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "#ff6a2b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  }

  const labelIndexes = [];
  for (let i = 0; i < labels.length; i += 1) {
    if (i % labelStep === 0) labelIndexes.push(i);
  }
  if (!labelIndexes.includes(labels.length - 1)) {
    labelIndexes.push(labels.length - 1);
  }
  if (labelIndexes.length >= 2) {
    const lastIdx = labelIndexes[labelIndexes.length - 1];
    const prevIdx = labelIndexes[labelIndexes.length - 2];
    const lastX = left + (lastIdx * (w - left - right)) / Math.max(labels.length - 1, 1);
    const prevX = left + (prevIdx * (w - left - right)) / Math.max(labels.length - 1, 1);
    if (lastX - prevX < minLabelGap) {
      labelIndexes.splice(labelIndexes.length - 2, 1);
    }
  }
  const labelIndexSet = new Set(labelIndexes);

  labels.forEach((label, i) => {
    if (!labelIndexSet.has(i)) return;
    const x = left + (i * (w - left - right)) / Math.max(labels.length - 1, 1);
    ctx.fillStyle = theme.label;
    ctx.font = "11px sans-serif";
    if (i === 0) {
      ctx.textAlign = "left";
      ctx.fillText(label, Math.max(2, x), chartBottom + 14);
    } else if (i === labels.length - 1) {
      ctx.textAlign = "right";
      ctx.fillText(label, w - right, chartBottom + 14);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(label, x, chartBottom + 14);
    }
  });
}

function handleTrendHover(event) {
  const rect = trendCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  let best = null;
  let bestDist = Infinity;
  for (const pt of trendPointRegions) {
    const dx = x - pt.x;
    const dy = y - pt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }

  if (!best || bestDist > 18) {
    hideTooltip();
    return;
  }

  chartTooltipEl.textContent = `${best.label}: ${best.value} orders`;
  chartTooltipEl.style.left = `${event.clientX + 12}px`;
  chartTooltipEl.style.top = `${event.clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function drawDonutChart(canvas, values, colors, labels, progress = 1) {
  const theme = getThemeColors();
  const { ctx, w, h } = setupCanvas(canvas);
  clearCanvas(ctx, canvas);
  const cx = w * 0.3;
  const cy = h * 0.5;
  const radius = Math.max(48, Math.min(82, h * 0.36));
  const thickness = Math.max(18, radius * 0.36);
  const inner = radius - thickness / 2;
  const outer = radius + thickness / 2;
  const sum = values.reduce((a, b) => a + b, 0) || 1;

  const darkMode = isDarkTheme();
  const gradBase = "#111111";
  donutSegments = [];
  let start = -Math.PI / 2;
  values.forEach((v, i) => {
    const sweep = ((v / sum) * Math.PI * 2) * progress;
    const end = start + sweep;
    const epsilon = 0.0015;
    const segStart = i === 0 ? start : start - epsilon;
    const segEnd = i === values.length - 1 ? end : end + epsilon;
    const gradRadius = (inner + outer) / 2;
    const sx = cx + Math.cos(segStart) * gradRadius;
    const sy = cy + Math.sin(segStart) * gradRadius;
    const ex = cx + Math.cos(segEnd) * gradRadius;
    const ey = cy + Math.sin(segEnd) * gradRadius;
    let fillStyle = colors[i % colors.length];
    if (darkMode) {
      const segGrad = ctx.createLinearGradient(sx, sy, ex, ey);
      segGrad.addColorStop(0, gradBase);
      segGrad.addColorStop(1, colors[i % colors.length]);
      fillStyle = segGrad;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outer, segStart, segEnd, false);
    ctx.arc(cx, cy, inner, segEnd, segStart, true);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    donutSegments.push({
      start,
      end,
      value: v,
      label: labels[i],
      cx,
      cy,
      inner,
      outer
    });
    start = end;
  });

  // Ring-only outlines in light mode only.
  if (!darkMode) {
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.stroke();
  }

  labels.forEach((label, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(w * 0.58, 20 + i * 18, 8, 8);
    ctx.fillStyle = theme.donutLabel;
    ctx.font = "11px sans-serif";
    ctx.fillText(label, w * 0.58 + 13, 27 + i * 18);
  });
}

function drawHorizontalBarChart(canvas, labels, values, color, extraLabels = [], progress = 1) {
  const theme = getThemeColors();
  const darkMode = isDarkTheme();
  const { ctx, w, h } = setupCanvas(canvas);
  clearCanvas(ctx, canvas);
  itemBarRegions = [];
  const left = 120;
  const right = 16;
  const valueGutter = 44;
  const max = Math.max(...values, 1);
  const rows = Math.max(labels.length, 1);
  const verticalPad = 6;
  const rowH = Math.max(14, Math.min(24, (h - verticalPad * 2) / rows));
  const contentHeight = rowH * rows;
  const top = Math.max(2, (h - contentHeight) / 2);

  labels.forEach((label, i) => {
    const y = top + i * rowH + rowH * 0.2;
    const bh = rowH * 0.6;
    const barArea = w - left - right - valueGutter;
    const bw = ((barArea * values[i]) / max) * progress;

    const barColor = Array.isArray(color) ? color[i % color.length] : color;
    if (barColor && typeof barColor === "object" && barColor.type === "outline") {
      ctx.strokeStyle = barColor.stroke || "#ff6a2b";
      ctx.lineWidth = Math.max(1.5, bh * 0.35);
      ctx.strokeRect(left + 0.5, y + 0.5, Math.max(0, bw - 1), Math.max(0, bh - 1));
    } else if (barColor && typeof barColor === "object" && barColor.type === "gradient") {
      const g = ctx.createLinearGradient(left, y, left + Math.max(1, bw), y);
      g.addColorStop(0, barColor.from || (darkMode ? "#111111" : "#ffffff"));
      g.addColorStop(1, barColor.to || "#ff6a2b");
      ctx.fillStyle = g;
      ctx.fillRect(left, y, bw, bh);
      if (!darkMode) {
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, y + 0.5, Math.max(0, bw - 1), Math.max(0, bh - 1));
      }
    } else {
      ctx.fillStyle = barColor;
      ctx.fillRect(left, y, bw, bh);
      if (!darkMode && barColor !== "#111111" && barColor !== "#000000") {
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, y + 0.5, Math.max(0, bw - 1), Math.max(0, bh - 1));
      }
    }

    ctx.fillStyle = theme.itemLabel;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    const short = label.length > 16 ? `${label.slice(0, 16)}...` : label;
    ctx.fillText(short, left - 8, y + bh * 0.72);

    ctx.textAlign = "left";
    const suffix = extraLabels[i] ? `  ${extraLabels[i]}` : "";
    const valueText = `${values[i]}${suffix}`;
    ctx.fillStyle = theme.valueLabel;
    const tx = Math.min(left + bw + 6, left + barArea + 6);
    ctx.fillText(valueText, tx, y + bh * 0.72);

    if (canvas === itemCountCanvas) {
      itemBarRegions.push({
        x: 0,
        y: y - 3,
        w,
        h: bh + 6,
        fullLabel: label,
        value: values[i]
      });
    }
  });
}

function hideTooltip() {
  chartTooltipEl.style.opacity = "0";
}

function handleRestaurantHover(event) {
  const rect = restaurantCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  let found = null;
  for (const seg of donutSegments) {
    const dx = x - seg.cx;
    const dy = y - seg.cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < seg.inner || r > seg.outer) continue;

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    if (angle >= seg.start && angle <= seg.end) {
      found = seg;
      break;
    }
  }

  if (!found) {
    hideTooltip();
    return;
  }

  chartTooltipEl.textContent = `${cleanRestaurantLabel(found.label)}: ${currency(found.value)}`;
  chartTooltipEl.style.left = `${event.clientX + 12}px`;
  chartTooltipEl.style.top = `${event.clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function drawHeatmap(canvas, hourlyByDay, activeDay, progress = 1) {
  const theme = getThemeColors();
  const { ctx, w, h } = setupCanvas(canvas);
  clearCanvas(ctx, canvas);
  heatmapRegions = [];
  const darkMode = isDarkTheme();
  const series = hourlyByDay[activeDay] || hourlyByDay.All || Array(24).fill(0);
  const max = Math.max(1, ...series);
  const cx = w * 0.5;
  const cy = h * 0.54;
  const innerR = Math.max(42, Math.min(w, h) * 0.2);
  const outerR = Math.max(innerR + 56, Math.min(w, h) * 0.45);
  const step = (Math.PI * 2) / 24;
  const gap = step * 0.08;
  const hoverHour = Number.isInteger(radialHoverHour) ? radialHoverHour : null;

  [0.25, 0.5, 0.75, 1].forEach((t) => {
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + (outerR - innerR) * t, 0, Math.PI * 2);
    ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  for (let i = 0; i < 24; i += 1) {
    const a = -Math.PI / 2 + i * step;
    const minorIn = outerR + 8;
    const minorOut = outerR + (i % 6 === 0 ? 18 : 13);
    const x1 = cx + Math.cos(a) * minorIn;
    const y1 = cy + Math.sin(a) * minorIn;
    const x2 = cx + Math.cos(a) * minorOut;
    const y2 = cy + Math.sin(a) * minorOut;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = darkMode
      ? (i % 6 === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)")
      : (i % 6 === 0 ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)");
    ctx.lineWidth = i % 6 === 0 ? 2 : 1;
    ctx.stroke();
  }

  for (let i = 0; i < 24; i += 1) {
    const val = series[i] || 0;
    const t = (val / max) * progress;
    const start = -Math.PI / 2 + i * step + gap / 2;
    const end = start + step - gap;
    const visualT = Math.max(0.08, t);
    const segOuter = innerR + (outerR - innerR) * visualT + (hoverHour === i ? 6 : 0);
    const dark = darkMode ? { r: 11, g: 26, b: 16 } : { r: 244, g: 251, b: 246 };
    const light = darkMode ? { r: 94, g: 230, b: 142 } : { r: 50, g: 196, b: 109 };
    const rC = Math.round(dark.r + (light.r - dark.r) * visualT);
    const gC = Math.round(dark.g + (light.g - dark.g) * visualT);
    const bC = Math.round(dark.b + (light.b - dark.b) * visualT);

    ctx.beginPath();
    ctx.arc(cx, cy, segOuter, start, end, false);
    ctx.arc(cx, cy, innerR, end, start, true);
    ctx.closePath();
    ctx.fillStyle = `rgb(${rC}, ${gC}, ${bC})`;
    ctx.fill();

    heatmapRegions.push({
      cx,
      cy,
      inner: innerR,
      outer: segOuter,
      start,
      end,
      hour: i,
      day: activeDay,
      count: val
    });
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
  ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const tickLabels = [
    { h: 0, label: "0" },
    { h: 3, label: "3" },
    { h: 6, label: "6" },
    { h: 9, label: "9" },
    { h: 12, label: "12" },
    { h: 15, label: "15" },
    { h: 18, label: "18" },
    { h: 21, label: "21" }
  ];
  ctx.fillStyle = theme.heatText;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  tickLabels.forEach((tick) => {
    const a = -Math.PI / 2 + tick.h * step;
    const tx = cx + Math.cos(a) * (outerR + 32);
    const ty = cy + Math.sin(a) * (outerR + 32) + 3;
    ctx.fillText(tick.label, tx, ty);
  });

  ctx.fillStyle = darkMode ? "#000000" : "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const hourText = hoverHour == null ? null : `${String(hoverHour).padStart(2, "0")}:00`;
  const hourVal = hoverHour == null ? null : series[hoverHour];
  ctx.fillStyle = theme.heatText;
  ctx.textAlign = "center";
  if (hourText) {
    ctx.font = "700 18px sans-serif";
    ctx.fillText(hourText, cx, cy - 2);
    ctx.font = "600 12px sans-serif";
    ctx.fillText(`${hourVal} orders`, cx, cy + 16);
  } else {
    ctx.font = "700 18px sans-serif";
    ctx.fillText(activeDay === "All" ? "All Days" : activeDay, cx, cy - 2);
    ctx.font = "500 11px sans-serif";
    ctx.fillStyle = theme.monthLabel || theme.label || theme.heatText;
    ctx.fillText("HOVER TO EXPLORE", cx, cy + 16);
  }
}

function handleHeatmapHover(event) {
  const rect = heatmapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = heatmapRegions.find((cell) => {
    const dx = x - cell.cx;
    const dy = y - cell.cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < cell.inner || r > cell.outer) return false;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    return angle >= cell.start && angle <= cell.end;
  });
  if (!hit) {
    if (radialHoverHour !== null && radialHourlyByDay) {
      radialHoverHour = null;
      drawHeatmap(heatmapCanvas, radialHourlyByDay, selectedRadialDay, 1);
    }
    hideTooltip();
    return;
  }
  if (radialHoverHour !== hit.hour && radialHourlyByDay) {
    radialHoverHour = hit.hour;
    drawHeatmap(heatmapCanvas, radialHourlyByDay, selectedRadialDay, 1);
  }
  const hh = String(hit.hour).padStart(2, "0");
  const hh2 = String((hit.hour + 1) % 24).padStart(2, "0");
  chartTooltipEl.textContent = `${hit.day} ${hh}:00-${hh2}:00 • ${hit.count} orders`;
  chartTooltipEl.style.left = `${event.clientX + 12}px`;
  chartTooltipEl.style.top = `${event.clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function handleItemHover(event) {
  const rect = itemCountCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = itemBarRegions.find((row) => x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h);
  if (!hit) {
    hideTooltip();
    return;
  }
  chartTooltipEl.textContent = `${hit.fullLabel}: ${hit.value}`;
  chartTooltipEl.style.left = `${event.clientX + 12}px`;
  chartTooltipEl.style.top = `${event.clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function handleMonthlyBarHover(event) {
  const rect = monthlyCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = monthlyBarRegions.find((bar) => {
    return x >= bar.x && x <= bar.x + bar.w && y >= bar.y && y <= bar.y + bar.h;
  });

  if (!hit) {
    hideTooltip();
    return;
  }

  chartTooltipEl.textContent = `${hit.label}: ${currency(hit.value)}`;
  chartTooltipEl.style.left = `${event.clientX + 12}px`;
  chartTooltipEl.style.top = `${event.clientY - 24}px`;
  chartTooltipEl.style.opacity = "1";
}

function render(orders) {
  const theme = getThemeColors();
  latestOrders = orders;
  const filteredOrders =
    selectedYear === "all"
      ? orders
      : orders.filter((o) => orderYear(o.dateISO) === selectedYear);

  const totalSpend = filteredOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgValue = totalOrders ? totalSpend / totalOrders : 0;

  const byMonth = groupBy(filteredOrders, (o) => monthKey(o.dateISO), (o) => Number(o.amount) || 0);
  const monthlyCount = groupBy(filteredOrders, (o) => monthKey(o.dateISO), () => 1);
  const monthEntries = Array.from(byMonth.entries())
    .filter(([k]) => k !== "Unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);
  const monthEntriesForChart = monthEntries.filter(([k]) => k !== currentMonthKey());
  const monthlySeries = monthEntriesForChart.length ? monthEntriesForChart : monthEntries;
  const monthLabels = monthlySeries.map(([k]) => monthLabel(k));
  const monthValues = monthlySeries.map(([, v]) => v);

  const activeMonths = new Set(filteredOrders.map((o) => monthKey(o.dateISO)).filter((k) => k !== "Unknown")).size;
  const topSpendMonth = topEntry(new Map(monthEntries));
  const currentMonth = currentMonthKey();
  const thisMonthSpend = byMonth.get(currentMonth) || 0;

  const weekendOrders = filteredOrders.filter((o) => {
    const dt = o.dateISO ? new Date(o.dateISO) : null;
    if (!dt || Number.isNaN(dt.getTime())) return false;
    const day = dt.getDay();
    return day === 0 || day === 6;
  }).length;
  const weekdayOrders = Math.max(0, totalOrders - weekendOrders);

  const amounts = filteredOrders.map((o) => Number(o.amount) || 0);
  const medianOrderValue = median(amounts);

  const restaurantOrderCount = groupBy(filteredOrders, (o) => o.restaurant || "Unknown", () => 1);
  const byRestaurantSpend = groupBy(
    filteredOrders,
    (o) => o.restaurant || "Unknown",
    (o) => Number(o.amount) || 0
  );

  const topRestaurantByCount = topEntry(restaurantOrderCount);
  const restSpendEntries = Array.from(byRestaurantSpend.entries()).sort((a, b) => b[1] - a[1]);

  const itemCounts = aggregateItems(filteredOrders);
  const topItemByCount = topEntry(itemCounts);
  const itemEntries = Array.from(itemCounts.entries()).sort((a, b) => b[1] - a[1]);

  totalEl.textContent = currency(totalSpend);
  ordersEl.textContent = String(totalOrders);
  avgEl.textContent = currency(avgValue);
  monthsEl.textContent = String(activeMonths);
  const monthKeysSorted = Array.from(byMonth.keys())
    .filter((k) => k !== "Unknown")
    .sort((a, b) => a.localeCompare(b));
  const currentCompareMonth =
    selectedYear === "all" ? currentMonth : monthKeysSorted[monthKeysSorted.length - 1] || currentMonth;
  const previousCompareMonth = previousMonthKey(currentCompareMonth);

  const currentSpendForDelta = byMonth.get(currentCompareMonth) || 0;
  const previousSpendForDelta = (previousCompareMonth && byMonth.get(previousCompareMonth)) || 0;
  const currentOrdersForDelta = monthlyCount.get(currentCompareMonth) || 0;
  const previousOrdersForDelta = (previousCompareMonth && monthlyCount.get(previousCompareMonth)) || 0;
  const currentAvgForDelta =
    currentOrdersForDelta > 0 ? currentSpendForDelta / currentOrdersForDelta : 0;
  const previousAvgForDelta =
    previousOrdersForDelta > 0 ? previousSpendForDelta / previousOrdersForDelta : 0;

  const spendDelta = getDeltaMeta(currentSpendForDelta, previousSpendForDelta);
  const ordersDelta = getDeltaMeta(currentOrdersForDelta, previousOrdersForDelta);
  const avgDelta = getDeltaMeta(currentAvgForDelta, previousAvgForDelta);

  setKpiMetaWithDelta(
    totalMetaEl,
    selectedYear === "all"
      ? `This month: ${currency(thisMonthSpend)}`
      : `${selectedYear} spend: ${currency(totalSpend)}`,
    spendDelta
  );
  setKpiMetaWithDelta(ordersMetaEl, `Wknd ${weekendOrders} / Wkdy ${weekdayOrders}`, ordersDelta);
  setKpiMetaWithDelta(avgMetaEl, `Median: ${currency(medianOrderValue)}`, avgDelta);
  monthsMetaEl.textContent = topSpendMonth
    ? `Highest: ${monthLabel(topSpendMonth[0])} (${currency(topSpendMonth[1])})`
    : "Highest month: NA";

  topRestaurantEl.textContent = topRestaurantByCount ? cleanRestaurantLabel(topRestaurantByCount[0]) : "NA";
  topRestaurantMetaEl.textContent = topRestaurantByCount
    ? `${topRestaurantByCount[1]} orders`
    : "0 orders";

  topItemEl.textContent = topItemByCount ? topItemByCount[0] : "NA";
  topItemMetaEl.textContent = topItemByCount ? `${topItemByCount[1]} qty` : "0 qty";

  subtitleEl.textContent = "";

  const spendTop6 = restSpendEntries.slice(0, 6);
  const spendLabels = spendTop6.map((e) => cleanRestaurantLabel(e[0]));
  const fallbackPalette = isDarkTheme()
    ? ["#f8fafc", "#ff8a00", "#ffe100", "#f7f700", "#ff5400"]
    : ["#000000", "#ff8a00", "#ffe100", "#f7f700", "#ff5400"];
  const pinnedColors = {
    "Arabian Grill Hub": "#ff5400",
    "Pizza Yard": "#ff8a00"
  };
  const usedColors = new Set(Object.values(pinnedColors));
  let fallbackIndex = 0;
  const donutColors = spendLabels.map((label) => {
    if (pinnedColors[label]) return pinnedColors[label];
    let color = fallbackPalette[fallbackIndex % fallbackPalette.length];
    let guard = 0;
    while (usedColors.has(color) && guard < fallbackPalette.length) {
      fallbackIndex += 1;
      color = fallbackPalette[fallbackIndex % fallbackPalette.length];
      guard += 1;
    }
    usedColors.add(color);
    fallbackIndex += 1;
    return color;
  });

  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hourlyByDay = {
    All: Array(24).fill(0),
    Mon: Array(24).fill(0),
    Tue: Array(24).fill(0),
    Wed: Array(24).fill(0),
    Thu: Array(24).fill(0),
    Fri: Array(24).fill(0),
    Sat: Array(24).fill(0),
    Sun: Array(24).fill(0)
  };
  for (const order of filteredOrders) {
    const dt = order.dateISO ? new Date(order.dateISO) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const day = (dt.getDay() + 6) % 7;
    const hour = dt.getHours();
    const dayName = heatmapDays[day];
    hourlyByDay.All[hour] += 1;
    hourlyByDay[dayName][hour] += 1;
  }
  if (!(selectedRadialDay in hourlyByDay)) selectedRadialDay = "All";
  radialHourlyByDay = hourlyByDay;
  if (radialDaySelectEl) radialDaySelectEl.value = selectedRadialDay;

  const itemsTop7 = itemEntries.slice(0, 7);
  const trendEntries = Array.from(monthlyCount.entries())
    .filter(([k]) => k !== "Unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);
  const trendEntriesForChart = trendEntries.filter(([k]) => k !== currentMonthKey());
  const trendSeries = trendEntriesForChart.length ? trendEntriesForChart : trendEntries;
  const trendLabels = trendSeries.map(([k]) => monthLabel(k));
  const trendValues = trendSeries.map(([, v]) => v);

  renderActivityCalendar(filteredOrders, true);

  animateCharts((progress) => {
    const monthlyAltColors = isDarkTheme()
      ? ["#f8fafc", { type: "outline", stroke: "#ff6a2b" }]
      : ["#111111", { type: "outline", stroke: "#ff6a2b" }];
    drawBarChart(monthlyCanvas, monthLabels, monthValues, monthlyAltColors, progress);
    drawDonutChart(
      restaurantCanvas,
      spendTop6.map((e) => e[1]),
      donutColors,
      spendLabels,
      progress
    );
    drawHeatmap(heatmapCanvas, hourlyByDay, selectedRadialDay, progress);
    drawHorizontalBarChart(
      itemCountCanvas,
      itemsTop7.map((e) => e[0]),
      itemsTop7.map((e) => e[1]),
      isDarkTheme()
        ? ["#f8fafc", { type: "gradient", from: "#111111", to: "#ff6a2b" }]
        : ["#111111", { type: "gradient", from: "#ffffff", to: "#ff6a2b" }],
      [],
      progress
    );
    drawLineChart(trendCanvas, trendLabels, trendValues, theme.trendLine, progress);
  });
}

function updateYearOptions(orders) {
  const years = Array.from(new Set(orders.map((o) => orderYear(o.dateISO)).filter(Boolean))).sort().reverse();
  yearSelectEl.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All Time";
  yearSelectEl.appendChild(allOpt);
  years.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    yearSelectEl.appendChild(opt);
  });
  if (!years.length) selectedYear = "all";
  if (!years.includes(selectedYear) && selectedYear !== "all") selectedYear = "all";
  yearSelectEl.value = selectedYear;
}

async function refreshFromStorage() {
  const [ordersRes, profileRes] = await Promise.all([
    chrome.runtime.sendMessage({ type: "GET_ORDERS" }),
    chrome.runtime.sendMessage({ type: "GET_PROFILE" })
  ]);
  const storedOrders = ordersRes?.orders || [];
  const orders = USE_MOCK_DEMO_DATA ? buildMockOrders() : storedOrders;
  const profile = profileRes?.profile || {};
  const phone = (profile.phone || "").replace(/\s+/g, "");
  profilePhoneTextEl.textContent = phone || (USE_MOCK_DEMO_DATA ? DEMO_PHONE : "—");
  subtitleEl.textContent = USE_MOCK_DEMO_DATA ? "Demo data mode" : "";
  updateYearOptions(orders);
  render(orders);
}

refreshBtn.addEventListener("click", async () => {
  subtitleEl.textContent = "Refreshing from active tab...";
  await chrome.runtime.sendMessage({ type: "TRIGGER_SYNC_ACTIVE_TAB" });
  await refreshFromStorage();
});

window.addEventListener("resize", () => {
  refreshFromStorage().catch(() => {});
});

restaurantCanvas.addEventListener("mousemove", handleRestaurantHover);
restaurantCanvas.addEventListener("mouseleave", hideTooltip);
monthlyCanvas.addEventListener("mousemove", handleMonthlyBarHover);
monthlyCanvas.addEventListener("mouseleave", hideTooltip);
heatmapCanvas.addEventListener("mousemove", handleHeatmapHover);
itemCountCanvas.addEventListener("mousemove", handleItemHover);
itemCountCanvas.addEventListener("mouseleave", hideTooltip);
trendCanvas.addEventListener("mousemove", handleTrendHover);
trendCanvas.addEventListener("mouseleave", hideTooltip);
themeToggleBtn.addEventListener("click", () => {
  applyTheme(isDarkTheme() ? "light" : "dark");
  render(latestOrders);
});
yearSelectEl.addEventListener("change", () => {
  selectedYear = yearSelectEl.value || "all";
  render(latestOrders);
});
if (radialDaySelectEl) {
  radialDaySelectEl.addEventListener("change", () => {
    selectedRadialDay = radialDaySelectEl.value || "All";
    radialHoverHour = null;
    render(latestOrders);
  });
}
heatmapCanvas.addEventListener("mouseleave", () => {
  radialHoverHour = null;
  if (radialHourlyByDay) drawHeatmap(heatmapCanvas, radialHourlyByDay, selectedRadialDay, 1);
  hideTooltip();
});

initTheme();
initRadialDayOptions();
initCardReorder();
refreshFromStorage().catch(() => {
  subtitleEl.textContent = "Failed to load data from extension storage.";
});
