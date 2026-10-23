'use strict';

/* =========================================================
   Ledgerly — Personal Money Manager
   All data is stored locally in the browser (localStorage).
   ========================================================= */

const STORAGE_KEY = 'ledgerly.v2';

const CATEGORIES = {
  expense: [
    { id: 'housing', name: 'Housing', icon: '🏠', color: '#8b5cf6' },
    { id: 'food', name: 'Food & Dining', icon: '🍜', color: '#f472b6' },
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#22d3ee' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#fbbf24' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#fb7185' },
    { id: 'utilities', name: 'Bills & Utilities', icon: '💡', color: '#60a5fa' },
    { id: 'health', name: 'Health', icon: '💊', color: '#34d399' },
    { id: 'education', name: 'Education', icon: '📚', color: '#c084fc' },
    { id: 'travel', name: 'Travel', icon: '✈️', color: '#2dd4bf' },
    { id: 'other', name: 'Other', icon: '📦', color: '#94a3b8' },
  ],
  income: [
    { id: 'salary', name: 'Salary', icon: '💼', color: '#34d399' },
    { id: 'freelance', name: 'Freelance', icon: '💻', color: '#22d3ee' },
    { id: 'investments', name: 'Investments', icon: '📈', color: '#a78bfa' },
    { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#f472b6' },
    { id: 'other-income', name: 'Other Income', icon: '💰', color: '#fbbf24' },
  ],
};
const ALL_CATS = [...CATEGORIES.expense, ...CATEGORIES.income];

// `demo` scales the sample data so it looks realistic in each currency.
const CURRENCIES = {
  IDR: { locale: 'id-ID', demo: 3500, label: 'IDR — Rupiah Indonesia (Rp)' },
  USD: { locale: 'en-US', demo: 1, label: 'USD — US Dollar ($)' },
  EUR: { locale: 'de-DE', demo: 0.92, label: 'EUR — Euro (€)' },
  GBP: { locale: 'en-GB', demo: 0.79, label: 'GBP — British Pound (£)' },
  SGD: { locale: 'en-SG', demo: 1.35, label: 'SGD — Singapore Dollar (S$)' },
  AUD: { locale: 'en-AU', demo: 1.5, label: 'AUD — Australian Dollar (A$)' },
  JPY: { locale: 'ja-JP', demo: 150, label: 'JPY — Japanese Yen (¥)' },
  VND: { locale: 'vi-VN', demo: 25000, label: 'VND — Vietnamese Dong (₫)' },
};
const ZERO_DECIMAL = ['IDR', 'VND', 'JPY'];

const GOAL_ICONS = ['🛟', '✈️', '💻', '🏡', '🚗', '🎓', '💍', '🎮', '📱', '🌴'];
const GOAL_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#fb7185', '#60a5fa'];

const VIEW_TITLES = {
  overview: 'Your money at a glance',
  transactions: 'Transactions',
  planning: 'Budgets & goals',
};

const ICON = {
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
};

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catById = (id) => ALL_CATS.find((c) => c.id === id) || { id, name: id, icon: '•', color: '#94a3b8' };
const sumType = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
const pctChange = (cur, prev) => (prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- state ---------------- */
function seed(currency = 'IDR') {
  const f = CURRENCIES[currency]?.demo ?? 3500;
  const round = (v) => (f >= 100 ? Math.round((v * f) / 1000) * 1000 : Math.round(v * f * 100) / 100);
  const rnd = mulberry32(20261023);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const now = new Date();
  const tx = [];
  const isIDR = currency === 'IDR';

  for (let m = 5; m >= 0; m--) {
    const base = addMonths(now, -m);
    const y = base.getFullYear(), mo = base.getMonth();
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const maxDay = m === 0 ? now.getDate() : daysIn;
    const day = () => 1 + Math.floor(rnd() * daysIn);
    const add = (d, type, category, amount, note) => {
      if (d > maxDay) return;
      tx.push({ id: uid(), type, category, amount: round(amount), note, date: toISO(new Date(y, mo, d)) });
    };

    add(1, 'income', 'salary', 4200, isIDR ? 'Gaji bulanan' : 'Monthly salary');
    if (rnd() > 0.35) add(day(), 'income', 'freelance', 300 + rnd() * 900, isIDR ? pick(['Proyek website', 'Desain logo', 'Konsultasi app', 'Desain UI mobile']) : pick(['Website project', 'Logo design', 'Consulting call', 'App UI work']));
    if (rnd() > 0.55) add(15, 'income', 'investments', 40 + rnd() * 160, isIDR ? 'Dividen reksadana' : 'Dividends');
    if (rnd() > 0.85) add(day(), 'income', 'gifts', 100 + rnd() * 150, isIDR ? 'Hadiah ulang tahun' : 'Birthday gift');

    add(2, 'expense', 'housing', 1250, isIDR ? 'Sewa apartemen / kos' : 'Rent');
    add(6, 'expense', 'utilities', 85 + rnd() * 60, isIDR ? 'Listrik PLN & air PAM' : 'Electricity & water');
    add(9, 'expense', 'utilities', 45, isIDR ? 'Tagihan wifi internet' : 'Internet');
    add(12, 'expense', 'utilities', 18, isIDR ? 'Paket data & pulsa' : 'Phone plan');
    for (let i = 0; i < 9; i++) add(day(), 'expense', 'food', 12 + rnd() * 70, isIDR ? pick(['Belanja supermarket', 'Makan siang kantor', 'Kopi kekinian', 'Makan malam resto', 'Sarapan / bakery', 'Kuliner pasar']) : pick(['Groceries', 'Lunch with team', 'Coffee', 'Dinner out', 'Bakery', 'Street food', 'Supermarket']));
    for (let i = 0; i < 4; i++) add(day(), 'expense', 'transport', 8 + rnd() * 40, isIDR ? pick(['Bensin Pertamax', 'Saldo e-money / MRT', 'Ongkos Grab / Gojek', 'Parkir bulanan', 'Cuci motor/mobil']) : pick(['Fuel', 'Metro card', 'Grab ride', 'Parking', 'Car wash']));
    for (let i = 0; i < 3; i++) add(day(), 'expense', 'shopping', 20 + rnd() * 140, isIDR ? pick(['Baju & pakaian', 'Dekorasi kamar', 'Sepatu sneakers', 'Aksesoris gadget', 'Buku bacaan']) : pick(['Clothes', 'Home decor', 'Sneakers', 'Gadget accessory', 'Books']));
    for (let i = 0; i < 2; i++) add(day(), 'expense', 'entertainment', 10 + rnd() * 55, isIDR ? pick(['Tiket bioskop XXI', 'Langganan Netflix & Spotify', 'Tiket konser musik', 'Game Steam/PlayStation', 'Nongkrong cafe malam']) : pick(['Cinema', 'Streaming subscription', 'Concert tickets', 'Video game', 'Bowling night']));
    if (rnd() > 0.45) add(day(), 'expense', 'health', 20 + rnd() * 110, isIDR ? pick(['Apotek & vitamin', 'Membership gym', 'Pemeriksaan dokter']) : pick(['Pharmacy', 'Gym membership', 'Dental check-up']));
    if (rnd() > 0.65) add(day(), 'expense', 'education', 25 + rnd() * 90, isIDR ? pick(['Kursus online Udemy', 'Workshop coding', 'Kelas bahasa asing']) : pick(['Online course', 'Workshop', 'Language class']));
    if (m === 2) add(18, 'expense', 'travel', 640, isIDR ? 'Liburan akhir pekan ke Bali' : 'Weekend trip to Da Lat');
  }

  return {
    currency,
    transactions: tx,
    budgets: {
      housing: round(1300), food: round(550), transport: round(180),
      shopping: round(300), entertainment: round(120), utilities: round(200),
    },
    goals: [
      { id: uid(), name: isIDR ? 'Dana darurat' : 'Emergency fund', icon: '🛟', color: '#34d399', target: round(10000), saved: round(6400) },
      { id: uid(), name: isIDR ? 'Liburan ke Jepang' : 'Japan trip', icon: '✈️', color: '#22d3ee', target: round(3500), saved: round(1250) },
      { id: uid(), name: isIDR ? 'Laptop baru' : 'New laptop', icon: '💻', color: '#a78bfa', target: round(2000), saved: round(1650) },
    ],
  };
}

function load() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem('ledgerly.v1');
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const isOldDemo = old.currency === 'USD' && old.transactions?.some((t) => t.note === 'Monthly salary' && t.amount === 4200);
        if (isOldDemo) return seed('IDR');
        old.currency = 'IDR';
        return old;
      }
      return null;
    }
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.transactions)) return null;
    s.budgets ||= {}; s.goals ||= [];
    if (!CURRENCIES[s.currency]) s.currency = 'IDR';
    return s;
  } catch { return null; }
}
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

let state = load();
if (!state) { state = seed('IDR'); save(); }

const TODAY = new Date();
const ui = {
  view: 'overview',
  month: monthStart(TODAY),
  filter: { q: '', type: 'all', cat: 'all', range: 'month' },
  editingId: null,
  fundGoalId: null,
  goalIcon: GOAL_ICONS[0],
  goalColor: GOAL_COLORS[0],
};

/* ---------------- formatting ---------------- */
function fmt(n, { compact = false, sign = false } = {}) {
  const cur = state.currency;
  const zero = ZERO_DECIMAL.includes(cur);
  const out = new Intl.NumberFormat(CURRENCIES[cur].locale, {
    style: 'currency', currency: cur,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact || zero ? 0 : 2,
    maximumFractionDigits: compact ? 1 : zero ? 0 : 2,
  }).format(Math.abs(n));
  if (n < 0) return '−' + out;
  return sign && n > 0 ? '+' + out : out;
}
function currencySymbol() {
  const parts = new Intl.NumberFormat(CURRENCIES[state.currency].locale, { style: 'currency', currency: state.currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value || state.currency;
}
const fmtDate = (iso, opts = { month: 'short', day: 'numeric' }) => parseISO(iso).toLocaleDateString('en-US', opts);
const txInMonth = (d) => { const k = monthKey(d); return state.transactions.filter((t) => t.date.startsWith(k)); };
const isCurrentMonth = (d) => monthKey(d) === monthKey(TODAY);

/* ---------------- number animation ---------------- */
function countUp(el, to, format) {
  const from = parseFloat(el.dataset.v || 0);
  el.dataset.v = to;
  cancelAnimationFrame(el._raf);
  const start = performance.now(), dur = 750;
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(from + (to - from) * e);
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

/* ---------------- charts ---------------- */
let sparkId = 0;
function sparkline(values, color) {
  const w = 92, h = 34;
  const max = Math.max(...values), min = Math.min(...values);
  const rng = max - min || 1;
  const pts = values.map((v, i) => [(i * w) / (values.length - 1), h - 4 - ((v - min) / rng) * (h - 8)]);
  const d = pts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const [px, py] = pts[i - 1];
    const cx = (px + p[0]) / 2;
    return `C${cx},${py} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  const id = `sg${++sparkId}`;
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${w},${h} L0,${h} Z" fill="url(#${id})"/>
    <path class="line" d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/>
  </svg>`;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

let cashflowData = [];
function renderCashflow() {
  const months = Array.from({ length: 6 }, (_, i) => addMonths(ui.month, i - 5));
  cashflowData = months.map((m) => { const t = txInMonth(m); const inc = sumType(t, 'income'), exp = sumType(t, 'expense'); return { m, inc, exp, net: inc - exp }; });
  const W = 640, H = 270, pl = 58, pr = 10, pt = 14, pb = 34;
  const max = niceMax(Math.max(1, ...cashflowData.flatMap((d) => [d.inc, d.exp])));
  const cw = (W - pl - pr) / cashflowData.length;
  const bw = Math.min(24, cw * 0.26);
  const y = (v) => pt + (H - pt - pb) * (1 - Math.max(0, v) / max);
  const base = y(0);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cash flow chart">
    <defs>
      <linearGradient id="gInc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981" stop-opacity=".55"/></linearGradient>
      <linearGradient id="gExp" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48" stop-opacity=".55"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4, yy = y(v);
    svg += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="axis" x="${pl - 10}" y="${yy + 4}" text-anchor="end">${fmt(v, { compact: true })}</text>`;
  }
  const netPts = [];
  cashflowData.forEach((d, i) => {
    const x0 = pl + cw * i, cx = x0 + cw / 2;
    const last = i === cashflowData.length - 1;
    svg += `<rect class="col-bg ${last ? 'current' : ''}" data-i="${i}" x="${x0 + 4}" y="${pt}" width="${cw - 8}" height="${H - pt - pb}" rx="10"/>`;
    const hi = base - y(d.inc), he = base - y(d.exp);
    if (hi > 0) svg += `<rect class="bar" style="animation-delay:${i * 60}ms" x="${cx - bw - 3}" y="${y(d.inc)}" width="${bw}" height="${hi}" rx="6" fill="url(#gInc)"/>`;
    if (he > 0) svg += `<rect class="bar" style="animation-delay:${i * 60 + 30}ms" x="${cx + 3}" y="${y(d.exp)}" width="${bw}" height="${he}" rx="6" fill="url(#gExp)"/>`;
    svg += `<text class="axis ${last ? 'current' : ''}" x="${cx}" y="${H - 10}" text-anchor="middle">${d.m.toLocaleDateString('en-US', { month: 'short' })}</text>`;
    netPts.push([cx, y(d.net)]);
  });
  const nd = netPts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const [px, py] = netPts[i - 1]; const cx = (px + p[0]) / 2;
    return `C${cx},${py} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  svg += `<path class="net-line" d="${nd}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" filter="url(#glow)"/>`;
  netPts.forEach((p, i) => { svg += `<circle class="net-dot" style="animation-delay:${600 + i * 80}ms" cx="${p[0]}" cy="${p[1]}" r="4" fill="#0b0e1c" stroke="#22d3ee" stroke-width="2.5"/>`; });
  cashflowData.forEach((_, i) => { svg += `<rect class="col-hit" data-i="${i}" x="${pl + cw * i}" y="0" width="${cw}" height="${H}"/>`; });
  svg += '</svg>';
  $('#cashflow-chart').innerHTML = svg;
}

function setupCashflowHover() {
  const wrap = $('#cashflow-chart'), tip = $('#chart-tooltip'), card = wrap.closest('.card');
  wrap.addEventListener('mousemove', (e) => {
    const hit = e.target.closest('.col-hit');
    $$('.col-bg', wrap).forEach((b) => b.classList.toggle('hover', hit && b.dataset.i === hit.dataset.i));
    if (!hit) { tip.hidden = true; return; }
    const d = cashflowData[+hit.dataset.i];
    tip.innerHTML = `<h4>${d.m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
      <div class="row"><span><i style="background:var(--green)"></i>Income</span><b>${fmt(d.inc)}</b></div>
      <div class="row"><span><i style="background:var(--rose)"></i>Expenses</span><b>${fmt(d.exp)}</b></div>
      <div class="row"><span><i style="background:var(--cyan)"></i>Net</span><b style="color:${d.net >= 0 ? 'var(--green)' : 'var(--rose)'}">${fmt(d.net, { sign: true })}</b></div>`;
    const cr = card.getBoundingClientRect(), hr = hit.getBoundingClientRect();
    tip.hidden = false;
    const half = tip.offsetWidth / 2;
    const left = Math.min(Math.max(hr.left + hr.width / 2 - cr.left, half + 8), cr.width - half - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${e.clientY - cr.top - 14}px`;
  });
  wrap.addEventListener('mouseleave', () => { tip.hidden = true; $$('.col-bg', wrap).forEach((b) => b.classList.remove('hover')); });
}

function renderDonut() {
  const exp = txInMonth(ui.month).filter((t) => t.type === 'expense');
  const total = exp.reduce((a, t) => a + t.amount, 0);
  const byCat = {};
  exp.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const segs = Object.entries(byCat).map(([id, value]) => ({ c: catById(id), value })).sort((a, b) => b.value - a.value);
  const donut = $('#donut-chart'), legend = $('#donut-legend');

  if (!total) {
    donut.innerHTML = `<svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="22"/></svg>
      <div class="donut-center"><small>No spending</small><strong>${fmt(0)}</strong></div>`;
    legend.innerHTML = '';
    $('#donut-sub').textContent = 'Nothing spent this month yet';
    return;
  }
  const R = 70, C = 2 * Math.PI * R, gap = segs.length > 1 ? 3 : 0;
  let off = 0, circles = '';
  segs.forEach((s) => {
    const len = (s.value / total) * C;
    const dash = Math.max(0.01, len - gap);
    circles += `<circle class="donut-seg" data-cat="${s.c.id}" cx="90" cy="90" r="${R}" fill="none" stroke="${s.c.color}" stroke-width="22"
      stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${s.c.name}: ${fmt(s.value)}</title></circle>`;
    off += len;
  });
  donut.innerHTML = `<svg viewBox="0 0 180 180">${circles}</svg>
    <div class="donut-center"><small id="donut-label">Total spent</small><strong id="donut-value">${fmt(total)}</strong></div>`;
  legend.innerHTML = segs.slice(0, 8).map((s) => `<li data-cat="${s.c.id}"><span class="sw" style="background:${s.c.color}"></span><span class="nm">${s.c.icon} ${s.c.name}</span><span class="pc">${Math.round((s.value / total) * 100)}%</span></li>`).join('');
  const top = segs[0];
  $('#donut-sub').textContent = `Top category: ${top.c.name} · ${Math.round((top.value / total) * 100)}%`;

  const highlight = (id) => {
    donut.classList.toggle('has-hover', !!id);
    $$('.donut-seg', donut).forEach((c) => c.classList.toggle('hl', c.dataset.cat === id));
    $$('li', legend).forEach((l) => l.classList.toggle('hl', l.dataset.cat === id));
    const s = segs.find((x) => x.c.id === id);
    $('#donut-label').textContent = s ? s.c.name : 'Total spent';
    $('#donut-value').textContent = fmt(s ? s.value : total);
  };
  [donut, legend].forEach((el) => {
    el.onmouseover = (e) => { const t = e.target.closest('[data-cat]'); highlight(t ? t.dataset.cat : null); };
    el.onmouseleave = () => highlight(null);
  });
}

/* ---------------- templates ---------------- */
function txItem(t, i = 0) {
  const c = catById(t.category);
  return `<li class="tx-item" style="animation-delay:${i * 40}ms" data-action="edit-tx" data-id="${t.id}">
    <span class="tx-icon" style="--c:${c.color}">${c.icon}</span>
    <div class="tx-meta"><p class="tx-note">${esc(t.note || c.name)}</p><p class="tx-sub">${c.name} · ${fmtDate(t.date)}</p></div>
    <span class="tx-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</span>
  </li>`;
}

function budgetRow(catId, limit, spent, full = false) {
  const c = catById(catId);
  const p = limit > 0 ? (spent / limit) * 100 : 0;
  const cls = p >= 100 ? 'over' : p >= 80 ? 'warn' : '';
  const stateText = p >= 100 ? `${fmt(spent - limit)} over budget` : `${fmt(limit - spent)} left`;
  return `<div class="budget-row ${cls} ${full ? 'full' : ''}">
    <div class="budget-top">
      <span class="budget-name"><span>${c.icon}</span><span>${c.name}</span></span>
      <span class="budget-nums"><b>${fmt(spent)}</b> / ${fmt(limit)}</span>
    </div>
    <div class="progress"><span style="--w:${Math.min(100, p)}%;--c:${c.color}"></span></div>
    <div class="budget-foot">
      <span class="state">${stateText}</span>
      <span style="display:flex;align-items:center">${Math.round(p)}%${full ? `<span class="budget-actions">
        <button class="icon-btn" data-action="edit-budget" data-id="${catId}" aria-label="Edit budget">${ICON.edit}</button>
        <button class="icon-btn danger" data-action="delete-budget" data-id="${catId}" aria-label="Remove budget">${ICON.trash}</button></span>` : ''}</span>
    </div>
  </div>`;
}

function ring(g, size = 60) {
  const p = Math.min(100, g.target > 0 ? (g.saved / g.target) * 100 : 0);
  const R = 30, C = 2 * Math.PI * R;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 72 72"><circle class="ring-bg" cx="36" cy="36" r="${R}"/>
    <circle class="ring-fg" cx="36" cy="36" r="${R}" stroke="${g.color}" style="color:${g.color};--C:${C}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p / 100)}"/></svg>
    <span>${g.icon}</span></div>`;
}

const emptyState = (icon, text, btn = '') => `<div class="empty"><div class="empty-icon">${icon}</div><p>${text}</p>${btn}</div>`;

/* ---------------- render: overview ---------------- */
function renderStats() {
  const cur = txInMonth(ui.month), prev = txInMonth(addMonths(ui.month, -1));
  const inc = sumType(cur, 'income'), exp = sumType(cur, 'expense');
  const pInc = sumType(prev, 'income'), pExp = sumType(prev, 'expense');
  const months = Array.from({ length: 6 }, (_, i) => addMonths(ui.month, i - 5));
  const balAt = (m) => { const k = monthKey(m); return state.transactions.filter((t) => t.date.slice(0, 7) <= k).reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0); };
  const rateOf = (list) => { const i = sumType(list, 'income'); return i > 0 ? ((i - sumType(list, 'expense')) / i) * 100 : 0; };
  const bal = balAt(ui.month), pBal = balAt(addMonths(ui.month, -1));
  const rate = rateOf(cur), pRate = rateOf(prev);

  countUp($('#stat-balance'), bal, (v) => fmt(v));
  countUp($('#stat-income'), inc, (v) => fmt(v));
  countUp($('#stat-expense'), exp, (v) => fmt(v));
  countUp($('#stat-savings'), rate, (v) => `${v.toFixed(1)}%`);

  setDelta('#balance-delta', pctChange(bal, pBal));
  setDelta('#income-delta', pctChange(inc, pInc));
  setDelta('#expense-delta', pctChange(exp, pExp), true);
  const diff = rate - pRate, sav = $('#savings-delta');
  sav.className = `delta ${prev.length ? (diff >= 0 ? 'up' : 'down') : 'neutral'}`;
  sav.textContent = prev.length ? `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1)} pts` : '—';

  const daysElapsed = isCurrentMonth(ui.month) ? TODAY.getDate() : new Date(ui.month.getFullYear(), ui.month.getMonth() + 1, 0).getDate();
  $('#balance-note').textContent = `${fmt(bal - pBal, { sign: true })} this month`;
  $('#income-note').textContent = `${cur.filter((t) => t.type === 'income').length} deposits`;
  $('#expense-note').textContent = `${fmt(exp / daysElapsed)}/day avg`;
  $('#savings-note').textContent = inc - exp >= 0 ? `${fmt(inc - exp)} saved` : `${fmt(exp - inc)} overspent`;

  $('#balance-spark').innerHTML = sparkline(months.map(balAt), '#ffffff');
  $('#income-spark').innerHTML = sparkline(months.map((m) => sumType(txInMonth(m), 'income')), '#34d399');
  $('#expense-spark').innerHTML = sparkline(months.map((m) => sumType(txInMonth(m), 'expense')), '#fb7185');
  $('#savings-spark').innerHTML = sparkline(months.map((m) => rateOf(txInMonth(m))), '#22d3ee');
}

function setDelta(sel, val, invert = false) {
  const el = $(sel);
  if (val == null || !isFinite(val)) { el.className = 'delta neutral'; el.textContent = '—'; return; }
  const up = val >= 0, good = invert ? !up : up;
  el.className = `delta ${good ? 'up' : 'down'}`;
  el.textContent = `${up ? '↑' : '↓'} ${Math.abs(val).toFixed(1)}%`;
}

function renderRecent() {
  const list = txInMonth(ui.month).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  $('#recent-list').innerHTML = list.length
    ? list.map(txItem).join('')
    : emptyState('🧾', 'No transactions this month.', '<button class="btn btn-secondary btn-sm" data-action="new-tx">+ Add your first one</button>');
}

function budgetData() {
  const exp = txInMonth(ui.month).filter((t) => t.type === 'expense');
  return Object.entries(state.budgets).map(([cat, limit]) => ({
    cat, limit, spent: exp.filter((t) => t.category === cat).reduce((a, t) => a + t.amount, 0),
  }));
}

function renderBudgetsMini() {
  const data = budgetData().sort((a, b) => b.spent / b.limit - a.spent / a.limit).slice(0, 4);
  $('#budget-mini').innerHTML = data.length
    ? data.map((b) => budgetRow(b.cat, b.limit, b.spent)).join('')
    : emptyState('🎯', 'No budgets yet.', '<button class="btn btn-secondary btn-sm" data-action="new-budget">+ Set a budget</button>');
}

function renderGoalsMini() {
  $('#goal-mini').innerHTML = state.goals.length
    ? state.goals.slice(0, 4).map((g) => `<div class="goal">${ring(g, 56)}<div class="goal-meta"><p class="goal-name">${esc(g.name)}</p><p class="goal-sub">${fmt(g.saved)} of ${fmt(g.target)}</p></div><span class="goal-pct" style="color:${g.color}">${Math.round(Math.min(100, (g.saved / g.target) * 100))}%</span></div>`).join('')
    : emptyState('🌱', 'No savings goals yet.', '<button class="btn btn-secondary btn-sm" data-action="new-goal">+ Create a goal</button>');
}

/* ---------------- render: transactions ---------------- */
function renderTransactions() {
  const { q, type, cat, range } = ui.filter;
  const needle = q.trim().toLowerCase();
  let list = range === 'month' ? txInMonth(ui.month) : [...state.transactions];
  list = list.filter((t) => (type === 'all' || t.type === type) && (cat === 'all' || t.category === cat)
    && (!needle || (t.note || '').toLowerCase().includes(needle) || catById(t.category).name.toLowerCase().includes(needle)));
  list.sort((a, b) => b.date.localeCompare(a.date));

  const inc = sumType(list, 'income'), exp = sumType(list, 'expense');
  $('#tx-summary').innerHTML = `<span><b>${list.length}</b> transactions</span><span class="inc">Income <b>${fmt(inc)}</b></span><span class="exp">Expenses <b>${fmt(exp)}</b></span><span>Net <b>${fmt(inc - exp, { sign: true })}</b></span>`;
  $('#tx-empty').hidden = list.length > 0;
  $('#tx-tbody').innerHTML = list.map((t) => {
    const c = catById(t.category);
    return `<tr data-action="edit-tx" data-id="${t.id}">
      <td class="date">${fmtDate(t.date, { month: 'short', day: 'numeric', year: range === 'all' ? 'numeric' : undefined })}</td>
      <td><div class="desc"><span class="tx-icon" style="--c:${c.color}">${c.icon}</span><span class="tx-note">${esc(t.note || c.name)}</span></div></td>
      <td><span class="pill" style="--c:${c.color}">${c.name}</span></td>
      <td class="num"><span class="tx-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}</span></td>
      <td><div class="row-actions"><button class="icon-btn danger" data-action="delete-tx" data-id="${t.id}" aria-label="Delete transaction">${ICON.trash}</button></div></td>
    </tr>`;
  }).join('');
}

/* ---------------- render: planning ---------------- */
function renderPlanning() {
  const data = budgetData().sort((a, b) => b.limit - a.limit);
  const totalLimit = data.reduce((a, b) => a + b.limit, 0);
  const totalSpent = data.reduce((a, b) => a + b.spent, 0);
  const allExp = sumType(txInMonth(ui.month), 'expense');
  $('#budget-summary').innerHTML = data.length ? `
    <div><small>Total budget</small><strong>${fmt(totalLimit)}</strong></div>
    <div><small>Spent in budgets</small><strong>${fmt(totalSpent)}</strong></div>
    <div><small>Unbudgeted spend</small><strong>${fmt(Math.max(0, allExp - totalSpent))}</strong></div>` : '';
  $('#budget-sub').textContent = `Spending limits for ${ui.month.toLocaleDateString('en-US', { month: 'long' })}`;
  $('#budget-full').innerHTML = data.length
    ? data.map((b) => budgetRow(b.cat, b.limit, b.spent, true)).join('')
    : emptyState('🎯', 'Set monthly limits to keep spending in check.', '<button class="btn btn-primary btn-sm" data-action="new-budget">+ Set your first budget</button>');

  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  $('#goal-sub').textContent = state.goals.length ? `${fmt(totalSaved)} saved across ${state.goals.length} goal${state.goals.length > 1 ? 's' : ''}` : 'Put money aside for what matters';
  $('#goal-full').innerHTML = state.goals.length
    ? state.goals.map((g, i) => {
      const p = Math.min(100, (g.saved / g.target) * 100), done = g.saved >= g.target;
      return `<div class="goal-card" style="animation-delay:${i * 60}ms">
        <div class="goal">${ring(g, 72)}<div class="goal-meta"><p class="goal-name">${esc(g.name)}</p><p class="goal-sub">${fmt(g.saved)} of ${fmt(g.target)}</p>
        ${done ? '<p class="goal-done">🎉 Goal reached!</p>' : `<p class="goal-pct" style="color:${g.color}">${Math.round(p)}%</p>`}</div></div>
        <div class="goal-card-actions">
          <button class="btn btn-secondary btn-sm" data-action="fund-goal" data-id="${g.id}">+ Add funds</button>
          <button class="icon-btn danger" data-action="delete-goal" data-id="${g.id}" aria-label="Delete goal">${ICON.trash}</button>
        </div></div>`;
    }).join('')
    : emptyState('🌱', 'Create a goal and watch your savings grow.', '<button class="btn btn-primary btn-sm" data-action="new-goal">+ Create a goal</button>');
}

/* ---------------- render: shell ---------------- */
function renderHeader() {
  const h = TODAY.getHours();
  $('#greeting').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'} 👋`;
  $('#view-title').textContent = VIEW_TITLES[ui.view];
  $('#month-label').textContent = ui.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('#next-month').disabled = isCurrentMonth(ui.month) || ui.month > TODAY;
  const sym = currencySymbol();
  $$('.currency-symbol').forEach((el) => { el.textContent = sym; });
  const isZero = ZERO_DECIMAL.includes(state.currency);
  const step = isZero ? '1' : '0.01';
  const ph = isZero ? '0' : '0.00';
  $$('.amount-input input').forEach((el) => {
    el.step = step;
    el.placeholder = ph;
  });
}

function render() {
  renderHeader();
  renderStats();
  renderCashflow();
  renderDonut();
  renderRecent();
  renderBudgetsMini();
  renderGoalsMini();
  renderTransactions();
  renderPlanning();
}

function setView(view) {
  ui.view = view;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  renderHeader();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- toasts ---------------- */
function toast(msg, { undo } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
  $('#toasts').appendChild(el);
  const remove = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  const timer = setTimeout(remove, undo ? 5000 : 3000);
  if (undo) el.querySelector('button').onclick = () => { clearTimeout(timer); undo(); remove(); };
}

/* ---------------- modals ---------------- */
function closeModal(el) { el.closest('dialog')?.close(); }

function fillCategorySelect(type, selected) {
  $('#tx-category').innerHTML = CATEGORIES[type].map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.icon}  ${c.name}</option>`).join('');
}

function openTxModal(tx) {
  ui.editingId = tx?.id || null;
  $('#tx-modal-title').textContent = tx ? 'Edit transaction' : 'Add transaction';
  const type = tx?.type || 'expense';
  $(`#type-${type}`).checked = true;
  fillCategorySelect(type, tx?.category);
  $('#tx-amount').value = tx?.amount ?? '';
  $('#tx-date').value = tx?.date || (isCurrentMonth(ui.month) ? toISO(TODAY) : toISO(ui.month));
  $('#tx-note').value = tx?.note || '';
  $('#tx-delete').hidden = !tx;
  $('#tx-error').hidden = true;
  $('#tx-modal').showModal();
  requestAnimationFrame(() => $('#tx-amount').focus());
}

function openBudgetModal(cat) {
  $('#budget-category').innerHTML = CATEGORIES.expense.map((c) => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${c.icon}  ${c.name}${state.budgets[c.id] ? ' (set)' : ''}</option>`).join('');
  if (!cat) { const free = CATEGORIES.expense.find((c) => !state.budgets[c.id]); if (free) $('#budget-category').value = free.id; }
  $('#budget-limit').value = state.budgets[$('#budget-category').value] ?? '';
  $('#budget-modal').showModal();
  requestAnimationFrame(() => $('#budget-limit').focus());
}

function renderChipPickers() {
  $('#goal-icons').innerHTML = GOAL_ICONS.map((i) => `<button type="button" data-icon="${i}" class="${i === ui.goalIcon ? 'active' : ''}">${i}</button>`).join('');
  $('#goal-colors').innerHTML = GOAL_COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === ui.goalColor ? 'active' : ''}" aria-label="Color ${c}"><span class="swatch" style="background:${c}"></span></button>`).join('');
}

function openGoalModal() {
  $('#goal-form').reset();
  ui.goalIcon = GOAL_ICONS[state.goals.length % GOAL_ICONS.length];
  ui.goalColor = GOAL_COLORS[state.goals.length % GOAL_COLORS.length];
  renderChipPickers();
  $('#goal-modal').showModal();
  requestAnimationFrame(() => $('#goal-name').focus());
}

function openFundModal(id) {
  const g = state.goals.find((x) => x.id === id);
  if (!g) return;
  ui.fundGoalId = id;
  $('#fund-title').textContent = `${g.icon} ${g.name}`;
  $('#fund-amount').value = '';
  $('#fund-modal').showModal();
  requestAnimationFrame(() => $('#fund-amount').focus());
}

/* ---------------- mutations ---------------- */
function deleteTx(id) {
  const idx = state.transactions.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const [removed] = state.transactions.splice(idx, 1);
  save(); render();
  toast('Transaction deleted', { undo: () => { state.transactions.push(removed); save(); render(); } });
}

function exportCSV() {
  const rows = [['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note'],
    ...[...state.transactions].sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.type, catById(t.category).name, t.amount, state.currency, t.note || ''])];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `ledgerly-transactions-${toISO(TODAY)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${state.transactions.length} transactions`);
}

/* ---------------- events ---------------- */
function bindEvents() {
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#prev-month').addEventListener('click', () => { ui.month = addMonths(ui.month, -1); render(); });
  $('#next-month').addEventListener('click', () => { ui.month = addMonths(ui.month, 1); render(); });
  $('#add-tx-btn').addEventListener('click', () => openTxModal());
  $('#add-budget-btn').addEventListener('click', () => openBudgetModal());
  $('#add-goal-btn').addEventListener('click', openGoalModal);

  // currency
  const sel = $('#currency-select');
  sel.innerHTML = Object.entries(CURRENCIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  sel.value = state.currency;
  sel.addEventListener('change', () => { state.currency = sel.value; save(); render(); toast(`Currency set to ${sel.value} (display only — amounts are not converted)`); });

  $('#export-btn').addEventListener('click', exportCSV);
  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Replace all your data with sample demo data?')) return;
    state = seed(state.currency); save(); ui.month = monthStart(TODAY); render(); toast('Demo data loaded');
  });
  $('#clear-btn').addEventListener('click', () => {
    if (!confirm('Delete ALL transactions, budgets and goals? This cannot be undone.')) return;
    state = { currency: state.currency, transactions: [], budgets: {}, goals: [] }; save(); render(); toast('All data cleared — fresh start!');
  });

  // delegated actions
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    switch (action) {
      case 'edit-tx': openTxModal(state.transactions.find((t) => t.id === id)); break;
      case 'delete-tx': e.stopPropagation(); deleteTx(id); break;
      case 'new-tx': openTxModal(); break;
      case 'goto': setView(el.dataset.view); break;
      case 'new-budget': openBudgetModal(); break;
      case 'edit-budget': openBudgetModal(id); break;
      case 'delete-budget': {
        const prev = state.budgets[id]; delete state.budgets[id]; save(); render();
        toast(`${catById(id).name} budget removed`, { undo: () => { state.budgets[id] = prev; save(); render(); } });
        break;
      }
      case 'new-goal': openGoalModal(); break;
      case 'fund-goal': openFundModal(id); break;
      case 'delete-goal': {
        const idx = state.goals.findIndex((g) => g.id === id); if (idx < 0) break;
        const [g] = state.goals.splice(idx, 1); save(); render();
        toast(`Goal “${g.name}” deleted`, { undo: () => { state.goals.splice(idx, 0, g); save(); render(); } });
        break;
      }
    }
  });

  // dialogs: close buttons + backdrop click
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  // transaction form
  $$('input[name="type"]').forEach((r) => r.addEventListener('change', () => fillCategorySelect(r.value)));
  $('#tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = parseFloat(fd.get('amount'));
    if (!(amount > 0) || !fd.get('date')) { $('#tx-error').hidden = false; $('#tx-amount').focus(); return; }
    const data = { type: fd.get('type'), category: fd.get('category'), amount: Math.round(amount * 100) / 100, date: fd.get('date'), note: String(fd.get('note') || '').trim() };
    if (ui.editingId) {
      Object.assign(state.transactions.find((t) => t.id === ui.editingId), data);
      toast('Transaction updated');
    } else {
      state.transactions.push({ id: uid(), ...data });
      toast(`${data.type === 'income' ? 'Income' : 'Expense'} of ${fmt(data.amount)} added`);
    }
    ui.month = monthStart(parseISO(data.date));
    save(); closeModal(e.target); render();
  });
  $('#tx-delete').addEventListener('click', () => { const id = ui.editingId; $('#tx-modal').close(); deleteTx(id); });

  // budget form
  $('#budget-category').addEventListener('change', () => { $('#budget-limit').value = state.budgets[$('#budget-category').value] ?? ''; });
  $('#budget-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const limit = parseFloat($('#budget-limit').value);
    if (!(limit > 0)) { $('#budget-limit').focus(); return; }
    const cat = $('#budget-category').value;
    state.budgets[cat] = Math.round(limit * 100) / 100;
    save(); closeModal(e.target); render();
    toast(`${catById(cat).name} budget set to ${fmt(limit)}`);
  });

  // goal form
  $('#goal-icons').addEventListener('click', (e) => { const b = e.target.closest('[data-icon]'); if (b) { ui.goalIcon = b.dataset.icon; renderChipPickers(); } });
  $('#goal-colors').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) { ui.goalColor = b.dataset.color; renderChipPickers(); } });
  $('#goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#goal-name').value.trim();
    const target = parseFloat($('#goal-target').value);
    const saved = parseFloat($('#goal-saved').value) || 0;
    if (!name) { $('#goal-name').focus(); return; }
    if (!(target > 0)) { $('#goal-target').focus(); return; }
    state.goals.push({ id: uid(), name, target, saved: Math.max(0, saved), icon: ui.goalIcon, color: ui.goalColor });
    save(); closeModal(e.target); render();
    toast(`Goal “${name}” created`);
  });

  // fund form
  $('#fund-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = parseFloat($('#fund-amount').value);
    const g = state.goals.find((x) => x.id === ui.fundGoalId);
    if (!g || !amt) { $('#fund-amount').focus(); return; }
    const wasDone = g.saved >= g.target;
    g.saved = Math.max(0, Math.round((g.saved + amt) * 100) / 100);
    save(); closeModal(e.target); render();
    toast(!wasDone && g.saved >= g.target ? `🎉 You reached “${g.name}”!` : `${fmt(amt, { sign: true })} → ${g.name}`);
  });

  // transaction filters
  $('#tx-search').addEventListener('input', (e) => { ui.filter.q = e.target.value; renderTransactions(); });
  $('#tx-type-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]'); if (!b) return;
    ui.filter.type = b.dataset.type;
    $$('#tx-type-filter button').forEach((x) => x.classList.toggle('active', x === b));
    renderTransactions();
  });
  $('#tx-cat-filter').innerHTML = '<option value="all">All categories</option>' +
    `<optgroup label="Expenses">${CATEGORIES.expense.map((c) => `<option value="${c.id}">${c.icon}  ${c.name}</option>`).join('')}</optgroup>` +
    `<optgroup label="Income">${CATEGORIES.income.map((c) => `<option value="${c.id}">${c.icon}  ${c.name}</option>`).join('')}</optgroup>`;
  $('#tx-cat-filter').addEventListener('change', (e) => { ui.filter.cat = e.target.value; renderTransactions(); });
  $('#tx-range').addEventListener('change', (e) => { ui.filter.range = e.target.value; renderTransactions(); });

  // keyboard shortcut: N = new transaction
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    e.preventDefault(); openTxModal();
  });

  setupCashflowHover();
}

bindEvents();
render();
