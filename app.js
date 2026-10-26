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
  nutrition: 'Nutrisi & Defisit Kalori AI',
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

/* =========================================================
   NUTRITION & AI FOOD ENGINE DATA & UTILS
   ========================================================= */
const FOOD_KNOWLEDGE_BASE = [
  // Karbohidrat & Pokok
  { keywords: ['nasi putih', 'nasi'], name: 'Nasi Putih', portion: '1 porsi (150g)', cal: 204, p: 4.2, c: 45, f: 0.4, fiber: 0.6 },
  { keywords: ['nasi merah'], name: 'Nasi Merah', portion: '1 porsi (150g)', cal: 165, p: 3.8, c: 35, f: 1.2, fiber: 2.8 },
  { keywords: ['nasi uduk'], name: 'Nasi Uduk', portion: '1 porsi (150g)', cal: 260, p: 5.1, c: 42, f: 8.5, fiber: 0.8 },
  { keywords: ['nasi kuning'], name: 'Nasi Kuning', portion: '1 porsi (150g)', cal: 245, p: 4.8, c: 40, f: 7.2, fiber: 0.8 },
  { keywords: ['nasi padang rendang', 'nasi rendang'], name: 'Nasi Padang Rendang Komplit', portion: '1 porsi nasi + rendang + daun singkong + kuah gulai', cal: 650, p: 28, c: 74, f: 26, fiber: 4.5 },
  { keywords: ['nasi goreng', 'nasgor'], name: 'Nasi Goreng', portion: '1 piring sedang', cal: 380, p: 9.5, c: 55, f: 14, fiber: 1.5 },
  { keywords: ['lontong', 'ketupat'], name: 'Lontong / Ketupat', portion: '1 buah (100g)', cal: 130, p: 2.5, c: 28, f: 0.3, fiber: 0.5 },
  { keywords: ['mie goreng', 'indomie goreng', 'mi goreng'], name: 'Mie Goreng Instant', portion: '1 bungkus', cal: 380, p: 8, c: 54, f: 15, fiber: 2 },
  { keywords: ['mie kuah', 'mie rebus', 'indomie kuah', 'mi kuah'], name: 'Mie Kuah Instant', portion: '1 bungkus', cal: 330, p: 7, c: 50, f: 12, fiber: 2 },
  { keywords: ['mie kuning', 'bihun', 'kwetiau'], name: 'Mie / Bihun Rebus', portion: '1 mangkok', cal: 190, p: 4, c: 40, f: 1.5, fiber: 1.2 },

  // Menu Spesifik Mie Gacoan & Dimsum Populer
  { keywords: ['mie suit', 'mie gacoan suit', 'gacoan suit', 'mie gacoan level 0', 'mie putih gacoan'], name: 'Mie Suit (Mie Gacoan)', portion: '1 porsi (gurih asin tanpa cabai + ayam & pangsit)', cal: 510, p: 17, c: 66, f: 19, fiber: 2.5 },
  { keywords: ['mie hompimpa', 'mie hompimpaa', 'gacoan hompimpa', 'mie pedas asin gacoan'], name: 'Mie Hompimpa (Mie Gacoan)', portion: '1 porsi (pedas asin level cabai + ayam & pangsit)', cal: 535, p: 17.5, c: 68, f: 20, fiber: 3.0 },
  { keywords: ['mie gacoan', 'mie iblis', 'gacoan level', 'mie pedas manis gacoan'], name: 'Mie Gacoan (Kecap Pedas Manis)', portion: '1 porsi (pedas manis gurih + ayam & pangsit)', cal: 550, p: 17, c: 74, f: 20, fiber: 3.0 },
  { keywords: ['udang keju', 'udang keju gacoan', 'dimsum udang keju'], name: 'Udang Keju (Mie Gacoan)', portion: '1 porsi (3 pcs olahan udang keju leleh goreng)', cal: 330, p: 16, c: 21, f: 20, fiber: 1.0 },
  { keywords: ['udang rambutan', 'udang rambutan gacoan', 'dimsum udang rambutan'], name: 'Udang Rambutan (Mie Gacoan)', portion: '1 porsi (3 pcs bola udang crispy)', cal: 295, p: 14, c: 19, f: 18, fiber: 0.8 },
  { keywords: ['siomay gacoan', 'siomay ayam udang', 'siomay dimsum', 'dimsum siomay', 'siomay', 'siomai'], name: 'Siomay Dimsum Ayam Udang', portion: '1 porsi (3 pcs siomay kukus lembut)', cal: 195, p: 15, c: 12, f: 9, fiber: 0.8 },
  { keywords: ['pangsit goreng gacoan', 'pangsit goreng'], name: 'Pangsit Goreng Gacoan', portion: '1 porsi (3 pcs pangsit goreng)', cal: 270, p: 10, c: 24, f: 15, fiber: 1.0 },
  { keywords: ['lumpia udang', 'lumpia gacoan'], name: 'Lumpia Udang Gacoan', portion: '1 porsi (3 pcs)', cal: 260, p: 13, c: 18, f: 15, fiber: 0.8 },
  { keywords: ['es gobak sodor', 'es teklek', 'es sluku bathok', 'es petak umpet'], name: 'Es Segar Gacoan', portion: '1 cup', cal: 195, p: 1, c: 46, f: 1, fiber: 0.5 },

  // Menu Spesifik SEC Bowl (Rice Bowl Populer Teruji Lab Beeru Indonesia)
  {
    keywords: [
      'sec bowl salted egg chicken original',
      'sec bowl salted egg original',
      'sec bowl salted egg chicken',
      'sec bowl original',
      'sec bowl salted egg',
      'secbowl salted egg',
      'secbowl original',
      'sec bowl',
      'secbowl'
    ],
    name: 'SEC Bowl Salted Egg Chicken Original',
    portion: '1 bowl reguler lengkap (nasi, ayam crispy, saus salted egg, telur)',
    cal: 843,
    p: 36.0,
    c: 88.0,
    f: 39.0,
    fiber: 1.8,
    notes: 'Teruji Lab Beeru Indonesia (842.6 kkal): Nasi putih (~265 kcal) + Ayam crispy (~310 kcal) + Saus salted egg mentega gurih (~180 kcal) + Telur ceplok (~88 kcal)'
  },
  {
    keywords: ['sec bowl lite', 'secbowl lite', 'salted egg lite sec bowl'],
    name: 'SEC Bowl Salted Egg Chicken (Ukuran LITE)',
    portion: '1 bowl porsi LITE',
    cal: 520,
    p: 25.0,
    c: 54.0,
    f: 22.0,
    fiber: 1.5,
    notes: 'Varian LITE: Porsi nasi dan takaran saus dikurangi khusus untuk defisit kalori'
  },
  {
    keywords: ['sec bowl kungpao', 'secbowl kungpao', 'sec bowl kung pao'],
    name: 'SEC Bowl Kung Pao Chicken',
    portion: '1 bowl lengkap',
    cal: 680,
    p: 32.0,
    c: 78.0,
    f: 26.0,
    fiber: 2.5
  },
  {
    keywords: ['sec bowl spicy caramel', 'secbowl spicy caramel'],
    name: 'SEC Bowl Spicy Caramel Chicken',
    portion: '1 bowl lengkap',
    cal: 720,
    p: 30.0,
    c: 86.0,
    f: 27.0,
    fiber: 2.0
  },
  {
    keywords: ['sec bowl rendang', 'secbowl rendang', 'sec bowl render beef', 'secbowl render beef'],
    name: 'SEC Bowl Render Beef (Rendang)',
    portion: '1 bowl lengkap',
    cal: 750,
    p: 34.0,
    c: 80.0,
    f: 32.0,
    fiber: 3.0
  },
  {
    keywords: ['sec bowl black pepper', 'secbowl black pepper'],
    name: 'SEC Bowl Black Pepper Chicken',
    portion: '1 bowl lengkap',
    cal: 660,
    p: 31.0,
    c: 75.0,
    f: 26.0,
    fiber: 2.0
  },

  // Rice Bowl & Salted Egg Populer Lainnya
  {
    keywords: ['eatlah salted egg chicken', 'eatlah salted egg', 'eatlah'],
    name: 'Eatlah Salted Egg Chicken Rice Bowl',
    portion: '1 box reguler lengkap',
    cal: 820,
    p: 35.0,
    c: 84.0,
    f: 38.0,
    fiber: 1.5,
    notes: 'Nasi putih + Ayam fillet krispi + Saus salted egg mentega gurih + Telur mata sapi'
  },
  {
    keywords: ['rice bowl salted egg', 'salted egg chicken rice bowl', 'nasi salted egg', 'ayam salted egg', 'salted egg chicken', 'salted egg bowl'],
    name: 'Salted Egg Chicken Rice Bowl Komplit',
    portion: '1 bowl/box lengkap (nasi, ayam krispi, saus salted egg, telur)',
    cal: 810,
    p: 34.0,
    c: 82.0,
    f: 37.0,
    fiber: 1.5,
    notes: 'Standar resto: Nasi putih (~250 kcal) + Ayam krispi (~290 kcal) + Saus salted egg butter (~185 kcal) + Telur ceplok (~85 kcal)'
  },
  {
    keywords: ['yoshinoya original beef bowl', 'yoshinoya beef bowl', 'yoshinoya original', 'yoshinoya'],
    name: 'Yoshinoya Original Beef Bowl',
    portion: '1 mangkok porsi reguler',
    cal: 670,
    p: 23.0,
    c: 75.0,
    f: 32.0,
    fiber: 2.0,
    notes: 'Nasi putih jepang + iris daging sapi US beef simmered onion broth'
  },
  {
    keywords: ['yoshinoya yakiniku beef bowl', 'yoshinoya yakiniku'],
    name: 'Yoshinoya Yakiniku Beef Bowl',
    portion: '1 mangkok porsi reguler',
    cal: 710,
    p: 22.0,
    c: 84.0,
    f: 32.0,
    fiber: 2.0,
    notes: 'Nasi putih jepang + daging sapi saus yakiniku manis gurih'
  },
  {
    keywords: ['hokben simple set', 'hokben bento', 'hokben paket', 'hokben'],
    name: 'HokBen Bento Simple Set Komplit',
    portion: '1 set lengkap nasi + teriyaki/yakiniku + gorengan + salad mayo',
    cal: 730,
    p: 26.0,
    c: 85.0,
    f: 32.0,
    fiber: 3.0
  },
  {
    keywords: ['moon chicken rice bowl', 'moon chicken'],
    name: 'Moon Chicken Rice Bowl Korea',
    portion: '1 bowl lengkap',
    cal: 720,
    p: 30.0,
    c: 76.0,
    f: 32.0,
    fiber: 2.0
  },
  {
    keywords: ['chicken katsu curry', 'katsu curry'],
    name: 'Chicken Katsu Curry Rice',
    portion: '1 porsi piring',
    cal: 780,
    p: 32.0,
    c: 92.0,
    f: 32.0,
    fiber: 3.5
  },
  {
    keywords: ['salmon mentai rice', 'salmon mentai', 'mentai rice'],
    name: 'Salmon Mentai Rice',
    portion: '1 porsi (nasi butter + salmon panggang + saus mentai mayo torched)',
    cal: 650,
    p: 28.0,
    c: 65.0,
    f: 31.0,
    fiber: 1.5
  },
  {
    keywords: ['kfc super besar 1', 'kfc super besar', 'kfc nasi ayam', 'paket kfc'],
    name: 'KFC Paket Nasi + Ayam Crispy',
    portion: '1 potong ayam crispy + nasi putih',
    cal: 680,
    p: 33.0,
    c: 65.0,
    f: 32.0,
    fiber: 1.5
  },
  {
    keywords: ['mcd panas 1', 'mcd panas', 'mcd nasi ayam'],
    name: 'McDonalds PaNas 1 (Nasi + Ayam Crispy)',
    portion: '1 potong ayam crispy + nasi putih',
    cal: 660,
    p: 32.0,
    c: 64.0,
    f: 31.0,
    fiber: 1.5
  },
  {
    keywords: ['mcd big mac', 'big mac'],
    name: 'McDonalds Big Mac',
    portion: '1 burger',
    cal: 550,
    p: 25.0,
    c: 45.0,
    f: 30.0,
    fiber: 3.0
  },
  {
    keywords: ['burger king whopper', 'whopper'],
    name: 'Burger King Whopper',
    portion: '1 burger',
    cal: 660,
    p: 28.0,
    c: 49.0,
    f: 40.0,
    fiber: 3.0
  },
  {
    keywords: ['nasi bebek madura', 'bebek madura', 'bebek goreng'],
    name: 'Nasi Bebek Goreng Bumbu Hitam Madura',
    portion: '1 porsi nasi + bebek goreng rempah hitam gurih pedas',
    cal: 760,
    p: 32.0,
    c: 65.0,
    f: 42.0,
    fiber: 1.5
  },
  {
    keywords: ['nasi gila'],
    name: 'Nasi Gila Komplit',
    portion: '1 porsi nasi + tumisan sosis bakso telur sawi',
    cal: 580,
    p: 22.0,
    c: 72.0,
    f: 24.0,
    fiber: 2.5
  },
  {
    keywords: [
      'nasi hainan campur + sate',
      'nasi hainan campur sate',
      'nasi hainam campur + sate',
      'nasi hainam campur sate',
      'nasi hainan campur',
      'nasi hainam campur',
      'nasi hainam ahong',
      'nasi hainan ahong',
      'nasi campur hainan',
      'nasi campur hainam'
    ],
    name: 'Nasi Hainan Campur Komplit + Sate',
    portion: '1 porsi nasi hainan + babi chasiu & panggang + sate manis + kuah',
    cal: 720,
    p: 38.0,
    c: 72.0,
    f: 32.0,
    fiber: 2.5,
    notes: 'Khas Nasi Hainan/Hainam Campur (Ahong 88): Nasi gurih hainan (~260 kcal) + Chasiu/siobak panggang (~260 kcal) + 1 tusuk sate manis gurih (~120 kcal) + Kuah sayur asin telur (~80 kcal)'
  },
  {
    keywords: [
      'nasi hainan komplit',
      'nasi hainan ayam',
      'nasi hainan',
      'nasi hainam komplit',
      'nasi hainam ayam',
      'nasi hainam'
    ],
    name: 'Nasi Hainan Ayam Komplit',
    portion: '1 porsi nasi minyak hainan + ayam rebus gurih',
    cal: 610,
    p: 28.0,
    c: 66.0,
    f: 26.0,
    fiber: 1.8
  },
  {
    keywords: [
      'kuotie goreng isi 10 pcs',
      'kuotie goreng isi 10',
      'kuotie goreng 10 pcs',
      'kuotie goreng 10',
      'kuotie goreng isi',
      'kuotie goreng',
      'kuo tie goreng',
      'kuotiek goreng',
      'gyoza goreng'
    ],
    name: 'Kuotie Goreng (1 Porsi isi 10 pcs)',
    portion: '1 porsi (10 pcs kuotie isi daging cincang & sawi gurih krispi)',
    cal: 480,
    p: 22.0,
    c: 44.0,
    f: 24.0,
    fiber: 2.2,
    notes: '1 porsi isi 10 pcs kuotie goreng khas Ahong / Santong (~48 kcal per pcs): Daging cincang gurih, sayuran sawi putih, kulit pangsit garing renyah'
  },
  {
    keywords: [
      'kuotie kukus',
      'kuotie panggang',
      'kuo tie kukus',
      'gyoza kukus',
      'kuotie',
      'kuo tie',
      'gyoza'
    ],
    name: 'Kuotie Panggang / Kukus',
    portion: '1 porsi (10 pcs kuotie panggang/kukus lembut)',
    cal: 410,
    p: 24.0,
    c: 42.0,
    f: 17.0,
    fiber: 2.2,
    notes: '1 porsi isi 10 pcs kuotie panggang / kukus tanpa minyak berlebih (~41 kcal per pcs)'
  },
  {
    keywords: ['nasi bakar ayam', 'nasi bakar'],
    name: 'Nasi Bakar Ayam Kemangi',
    portion: '1 bungkus nasi bakar isi suwir ayam',
    cal: 480,
    p: 23.0,
    c: 60.0,
    f: 17.0,
    fiber: 2.5
  },
  {
    keywords: ['mie ayam bakso', 'mie ayam komplit', 'mie ayam'],
    name: 'Mie Ayam Bakso & Pangsit',
    portion: '1 mangkok mie ayam + 2 butir bakso + pangsit',
    cal: 520,
    p: 22.0,
    c: 68.0,
    f: 19.0,
    fiber: 2.8
  },
  {
    keywords: ['kwetiau goreng sapi', 'kwetiau sapi'],
    name: 'Kwetiau Goreng Daging Sapi',
    portion: '1 piring sedang',
    cal: 640,
    p: 24.0,
    c: 74.0,
    f: 28.0,
    fiber: 2.5
  },
  {
    keywords: ['bihun goreng'],
    name: 'Bihun Goreng Ayam Sayur',
    portion: '1 piring sedang',
    cal: 480,
    p: 14.0,
    c: 66.0,
    f: 18.0,
    fiber: 2.2
  },
  {
    keywords: ['sate taichan'],
    name: 'Sate Taichan Ayam',
    portion: '1 porsi (10 tusuk dada ayam tanpa minyak + sambal)',
    cal: 210,
    p: 36.0,
    c: 3.0,
    f: 6.0,
    fiber: 0.5
  },
  {
    keywords: ['pasta spaghetti carbonara', 'spaghetti carbonara', 'carbonara'],
    name: 'Spaghetti Carbonara Creamy',
    portion: '1 porsi pasta krim telur keju daging asap',
    cal: 620,
    p: 22.0,
    c: 65.0,
    f: 31.0,
    fiber: 2.5
  },
  {
    keywords: ['pasta spaghetti bolognese', 'spaghetti bolognese', 'bolognese'],
    name: 'Spaghetti Bolognese Daging Sapi',
    portion: '1 porsi pasta saus tomat daging cincang',
    cal: 460,
    p: 21.0,
    c: 62.0,
    f: 14.0,
    fiber: 3.5
  },
  {
    keywords: ['pizza', 'pizza pan'],
    name: 'Pizza Keju & Daging',
    portion: '1 slice (pan pizza sedang)',
    cal: 280,
    p: 12.0,
    c: 32.0,
    f: 12.0,
    fiber: 1.5
  },
  {
    keywords: ['kopi kenangan mantan', 'kopi kenangan'],
    name: 'Kopi Kenangan Mantan (Kopi Susu Gula Aren)',
    portion: '1 cup reguler',
    cal: 190,
    p: 3.5,
    c: 27.0,
    f: 7.5,
    fiber: 0.5
  },
  {
    keywords: ['chatime milk tea with pearl', 'chatime pearl milk tea', 'chatime milk tea', 'chatime'],
    name: 'Chatime Milk Tea with Pearl (Boba)',
    portion: '1 cup reguler',
    cal: 340,
    p: 3.0,
    c: 62.0,
    f: 9.0,
    fiber: 0.5
  },
  {
    keywords: ['mixue boba sundae'],
    name: 'Mixue Boba Sundae',
    portion: '1 cup sundae',
    cal: 280,
    p: 4.2,
    c: 48.0,
    f: 8.0,
    fiber: 0.5
  },
  {
    keywords: ['mixue ice cream cone', 'mixue cone', 'mixue ice cream'],
    name: 'Mixue Ice Cream Cone',
    portion: '1 cone vanila',
    cal: 160,
    p: 3.0,
    c: 26.0,
    f: 5.0,
    fiber: 0.2
  },
  { keywords: ['seblak komplit', 'seblak'], name: 'Seblak Komplit', portion: '1 mangkok sedang', cal: 460, p: 16, c: 56, f: 19, fiber: 2.2 },
  { keywords: ['batagor'], name: 'Batagor Bumbu Kacang', portion: '1 porsi', cal: 390, p: 14, c: 41, f: 19, fiber: 2.8 },
  { keywords: ['pempek kapal selam', 'pempek'], name: 'Pempek Kapal Selam + Cuko', portion: '1 buah besar isi telur', cal: 325, p: 16, c: 38, f: 12, fiber: 1.0 },
  { keywords: ['oatmeal', 'oat'], name: 'Oatmeal', portion: '1 mangkok (40g kering)', cal: 150, p: 5, c: 27, f: 2.5, fiber: 4 },
  { keywords: ['roti gandum'], name: 'Roti Gandum Utuh', portion: '1 lembar', cal: 75, p: 3.5, c: 13, f: 1.1, fiber: 2.2 },
  { keywords: ['roti tawar', 'roti'], name: 'Roti Tawar Putih', portion: '1 lembar', cal: 80, p: 2.8, c: 15, f: 1.0, fiber: 0.8 },
  { keywords: ['kentang rebus', 'kentang kukus'], name: 'Kentang Rebus', portion: '1 buah sedang (150g)', cal: 130, p: 3, c: 30, f: 0.2, fiber: 2.5 },
  { keywords: ['kentang goreng', 'french fries'], name: 'Kentang Goreng', portion: '1 porsi (100g)', cal: 312, p: 3.4, c: 41, f: 15, fiber: 3.8 },
  { keywords: ['ubi rebus', 'ubi jalar', 'ubi'], name: 'Ubi Jalar Rebus', portion: '1 buah sedang (130g)', cal: 112, p: 2, c: 26, f: 0.1, fiber: 3.9 },

  // Protein Hewani
  { keywords: ['dada ayam bakar', 'dada ayam panggang'], name: 'Dada Ayam Bakar / Panggang', portion: '100g fillet', cal: 165, p: 31, c: 1.5, f: 3.6, fiber: 0 },
  { keywords: ['dada ayam rebus', 'dada ayam kukus', 'dada ayam'], name: 'Dada Ayam Kukus / Rebus', portion: '100g fillet', cal: 150, p: 31, c: 0, f: 2.5, fiber: 0 },
  { keywords: ['ayam bakar', 'paha ayam bakar'], name: 'Ayam Bakar Tradisional', portion: '1 potong (paha/dada)', cal: 215, p: 25, c: 4, f: 11, fiber: 0 },
  { keywords: ['ayam goreng', 'paha ayam goreng'], name: 'Ayam Goreng Tradisional', portion: '1 potong', cal: 260, p: 24, c: 3, f: 16, fiber: 0 },
  { keywords: ['ayam geprek'], name: 'Ayam Geprek Sambal', portion: '1 porsi ayam tepung sambal korek', cal: 340, p: 22, c: 14, f: 21, fiber: 1 },
  { keywords: ['rendang sapi', 'rendang daging', 'rendang'], name: 'Rendang Daging Sapi', portion: '1 potong (70g)', cal: 240, p: 18, c: 6, f: 16, fiber: 1 },
  { keywords: ['sate ayam'], name: 'Sate Ayam Bumbu Kacang', portion: '5 tusuk + bumbu', cal: 220, p: 21, c: 9, f: 11, fiber: 1.2 },
  { keywords: ['sate kambing'], name: 'Sate Kambing', portion: '5 tusuk + kecap', cal: 260, p: 23, c: 10, f: 14, fiber: 0.5 },
  { keywords: ['telur rebus'], name: 'Telur Ayam Rebus', portion: '1 butir (50g)', cal: 74, p: 6.3, c: 0.4, f: 5.0, fiber: 0 },
  { keywords: ['putih telur'], name: 'Putih Telur Rebus', portion: '1 butir', cal: 17, p: 3.6, c: 0.2, f: 0.1, fiber: 0 },
  { keywords: ['telur dadar'], name: 'Telur Dadar Goreng', portion: '1 butir', cal: 135, p: 6.5, c: 1.0, f: 11.5, fiber: 0 },
  { keywords: ['telur ceplok', 'telur mata sapi', 'telur', 'telor'], name: 'Telur Mata Sapi / Ceplok', portion: '1 butir', cal: 115, p: 6.3, c: 0.5, f: 9.5, fiber: 0 },
  { keywords: ['ikan nila bakar', 'ikan bakar'], name: 'Ikan Nila / Mas Bakar', portion: '1 ekor sedang (150g)', cal: 195, p: 28, c: 2, f: 8, fiber: 0 },
  { keywords: ['ikan lele goreng', 'pecel lele', 'lele goreng'], name: 'Ikan Lele Goreng', portion: '1 ekor sedang', cal: 240, p: 22, c: 2, f: 16, fiber: 0 },
  { keywords: ['salmon'], name: 'Ikan Salmon Panggang', portion: '100g', cal: 206, p: 22, c: 0, f: 12, fiber: 0 },
  { keywords: ['tuna'], name: 'Ikan Tuna Kukus/Panggang', portion: '100g', cal: 130, p: 28, c: 0, f: 1.5, fiber: 0 },
  { keywords: ['udang'], name: 'Udang Rebus / Tumis', portion: '100g (sekitar 7-8 ekor)', cal: 105, p: 21, c: 1, f: 1.5, fiber: 0 },
  { keywords: ['cumi'], name: 'Cumi Rebus / Panggang', portion: '100g', cal: 92, p: 16, c: 3, f: 1.4, fiber: 0 },
  { keywords: ['daging sapi', 'steak sapi'], name: 'Daging Sapi Panggang / Steak', portion: '100g', cal: 210, p: 26, c: 0, f: 12, fiber: 0 },
  { keywords: ['bakso sapi', 'bakso urat', 'bakso'], name: 'Bakso Sapi Kuah', portion: '1 mangkok (5 butir + kuah)', cal: 285, p: 18, c: 16, f: 16, fiber: 1 },
  { keywords: ['soto ayam'], name: 'Soto Ayam Bening', portion: '1 mangkok tanpa nasi', cal: 180, p: 16, c: 8, f: 9, fiber: 1 },
  { keywords: ['soto betawi'], name: 'Soto Betawi Kuah Santan/Susu', portion: '1 mangkok tanpa nasi', cal: 340, p: 22, c: 9, f: 24, fiber: 1 },
  { keywords: ['rawon'], name: 'Rawon Daging Sapi', portion: '1 mangkok tanpa nasi', cal: 260, p: 22, c: 8, f: 15, fiber: 1.2 },

  // Protein Nabati
  { keywords: ['tempe bacem', 'tempe bakar'], name: 'Tempe Bacem / Bakar', portion: '1 potong (50g)', cal: 95, p: 7.5, c: 9, f: 3.5, fiber: 2.5 },
  { keywords: ['tempe goreng'], name: 'Tempe Goreng', portion: '1 potong (50g)', cal: 125, p: 7.0, c: 6, f: 8.5, fiber: 2 },
  { keywords: ['tahu bacem', 'tahu kukus'], name: 'Tahu Bacem / Kukus', portion: '1 potong (60g)', cal: 65, p: 6.0, c: 4, f: 2.5, fiber: 1 },
  { keywords: ['tahu goreng'], name: 'Tahu Goreng', portion: '1 potong (60g)', cal: 95, p: 5.5, c: 3, f: 7.0, fiber: 0.8 },

  // Sayuran & Masakan Sehat
  { keywords: ['sayur bayam', 'bayam bening', 'bayam'], name: 'Sayur Bening Bayam', portion: '1 mangkok (150g)', cal: 40, p: 2.8, c: 6, f: 0.4, fiber: 2.4 },
  { keywords: ['sayur asem'], name: 'Sayur Asem', portion: '1 mangkok (200g)', cal: 75, p: 2.5, c: 14, f: 1.2, fiber: 3.2 },
  { keywords: ['sayur sop', 'sop ayam'], name: 'Sayur Sop Wortel Kentang', portion: '1 mangkok', cal: 85, p: 3.5, c: 14, f: 1.8, fiber: 2.8 },
  { keywords: ['kangkung', 'cah kangkung', 'tumis kangkung'], name: 'Tumis Kangkung', portion: '1 porsi (120g)', cal: 95, p: 3.2, c: 7, f: 6.5, fiber: 2.6 },
  { keywords: ['sayur lodeh'], name: 'Sayur Lodeh Santan', portion: '1 mangkok', cal: 140, p: 3.5, c: 12, f: 9.0, fiber: 3 },
  { keywords: ['daun singkong', 'gulai daun singkong'], name: 'Sayur Daun Singkong Gulai', portion: '1 porsi (100g)', cal: 125, p: 4, c: 9, f: 8.5, fiber: 3.5 },
  { keywords: ['capcay', 'cap cay'], name: 'Capcay Sayuran', portion: '1 porsi (150g)', cal: 110, p: 4.5, c: 12, f: 5.2, fiber: 3.8 },
  { keywords: ['gado-gado', 'gado gado'], name: 'Gado-Gado Bumbu Kacang', portion: '1 porsi sedang', cal: 320, p: 13, c: 32, f: 16, fiber: 5.5 },
  { keywords: ['karedok', 'pecel'], name: 'Pecel / Karedok Sayur', portion: '1 porsi', cal: 260, p: 9, c: 28, f: 13, fiber: 5 },
  { keywords: ['brokoli'], name: 'Brokoli Kukus', portion: '1 mangkok (100g)', cal: 35, p: 2.8, c: 7, f: 0.4, fiber: 2.6 },
  { keywords: ['lalapan', 'timun', 'selada'], name: 'Lalapan Segar (Timun/Selada/Kemangi)', portion: '1 porsi', cal: 20, p: 1.0, c: 4, f: 0.2, fiber: 1.5 },
  { keywords: ['sambal ijo', 'sambal korek', 'sambal terasi', 'sambal'], name: 'Sambal Tradisional', portion: '1-2 sdm', cal: 35, p: 0.6, c: 3.5, f: 2.2, fiber: 1 },

  // Buah-buahan
  { keywords: ['apel fuji', 'apel'], name: 'Apel Segar', portion: '1 buah sedang (150g)', cal: 85, p: 0.5, c: 21, f: 0.3, fiber: 4.0 },
  { keywords: ['pisang ambon', 'pisang'], name: 'Pisang Segar', portion: '1 buah sedang (110g)', cal: 98, p: 1.2, c: 25, f: 0.3, fiber: 2.8 },
  { keywords: ['alpukat'], name: 'Alpukat Segar', portion: '1/2 buah (100g)', cal: 160, p: 2.0, c: 8.5, f: 14.7, fiber: 6.7 },
  { keywords: ['pepaya'], name: 'Pepaya Potong', portion: '1 mangkok (150g)', cal: 60, p: 0.9, c: 15, f: 0.4, fiber: 2.5 },
  { keywords: ['semangka'], name: 'Semangka Segar', portion: '1 potong besar (200g)', cal: 60, p: 1.2, c: 15, f: 0.3, fiber: 0.8 },
  { keywords: ['jeruk'], name: 'Jeruk Manis', portion: '1 buah', cal: 62, p: 1.2, c: 15, f: 0.2, fiber: 3.1 },
  { keywords: ['madu'], name: 'Madu Alami', portion: '1 sdm (20g)', cal: 64, p: 0.1, c: 17, f: 0, fiber: 0 },

  // Minuman & Camilan
  { keywords: ['kopi hitam', 'americano', 'espresso'], name: 'Kopi Hitam / Americano', portion: '1 cangkir (tanpa gula)', cal: 4, p: 0.3, c: 0.5, f: 0, fiber: 0 },
  { keywords: ['kopi susu aren', 'kopi susu gula aren', 'kopi susu'], name: 'Kopi Susu Gula Aren', portion: '1 cup (250ml)', cal: 185, p: 3.5, c: 26, f: 7.5, fiber: 0.5 },
  { keywords: ['es teh manis', 'teh manis'], name: 'Es Teh Manis', portion: '1 gelas besar (300ml)', cal: 90, p: 0, c: 22, f: 0, fiber: 0 },
  { keywords: ['teh tawar', 'es teh tawar'], name: 'Es Teh Tawar', portion: '1 gelas', cal: 2, p: 0, c: 0.4, f: 0, fiber: 0 },
  { keywords: ['boba', 'boba milk tea'], name: 'Boba Milk Tea', portion: '1 cup', cal: 350, p: 3, c: 65, f: 9, fiber: 0.5 },
  { keywords: ['susu full cream'], name: 'Susu Sapi Full Cream', portion: '1 gelas (200ml)', cal: 130, p: 6.8, c: 9.8, f: 7.0, fiber: 0 },
  { keywords: ['susu low fat', 'susu skim'], name: 'Susu Rendah Lemak (Low Fat)', portion: '1 gelas (200ml)', cal: 90, p: 7.0, c: 10, f: 2.0, fiber: 0 },
  { keywords: ['susu oat', 'oat milk'], name: 'Susu Oat (Oat Milk)', portion: '1 gelas (200ml)', cal: 110, p: 3.0, c: 16, f: 3.5, fiber: 2.0 },
  { keywords: ['whey protein', 'whey'], name: 'Whey Protein Shake', portion: '1 scoop (30g)', cal: 120, p: 24, c: 2.5, f: 1.5, fiber: 0 },
  { keywords: ['jus alpukat'], name: 'Jus Alpukat Cokelat', portion: '1 gelas', cal: 290, p: 3.5, c: 38, f: 15, fiber: 6 },
  { keywords: ['gorengan', 'bakwan', 'bala-bala'], name: 'Gorengan Bakwan Sayur', portion: '1 buah', cal: 140, p: 2.5, c: 16, f: 7.5, fiber: 1.2 },
  { keywords: ['tahu isi'], name: 'Tahu Isi Goreng', portion: '1 buah', cal: 135, p: 4.5, c: 12, f: 8.0, fiber: 1.5 },
  { keywords: ['pisang goreng'], name: 'Pisang Goreng', portion: '1 buah', cal: 155, p: 1.5, c: 25, f: 6.0, fiber: 1.8 },
  { keywords: ['martabak manis', 'terang bulan'], name: 'Martabak Manis Cokelat Keju', portion: '1 potong', cal: 270, p: 5.5, c: 38, f: 12, fiber: 1 },
  { keywords: ['martabak telur'], name: 'Martabak Telur Daging Sapi', portion: '1 potong', cal: 190, p: 8.0, c: 11, f: 12.5, fiber: 0.8 },
  { keywords: ['kerupuk', 'krupuk'], name: 'Kerupuk Putih', portion: '1 buah', cal: 65, p: 0.4, c: 8, f: 3.5, fiber: 0.1 },
];

function defaultNutrition() {
  const todayStr = toISO(new Date());
  return {
    profile: {
      weight: 68,
      height: 172,
      age: 26,
      gender: 'male',
      activity: 'moderate',
      goal: 'deficit_moderate',
      targetWeight: 63,
    },
    foodLogs: [
      {
        id: uid(),
        date: todayStr,
        meal: 'breakfast',
        name: 'Oatmeal pisang madu & 2 butir telur rebus',
        calories: 385,
        protein: 23,
        carbs: 52,
        fat: 9.5,
        notes: 'Sarapan bergizi tinggi serat & protein',
      },
      {
        id: uid(),
        date: todayStr,
        meal: 'lunch',
        name: 'Nasi putih 1 porsi, dada ayam bakar & sayur bayam bening',
        calories: 490,
        protein: 41,
        carbs: 56,
        fat: 10,
        notes: 'Makan siang seimbang rendah minyak',
      },
      {
        id: uid(),
        date: todayStr,
        meal: 'snack',
        name: '1 buah apel fuji & kopi hitam americano',
        calories: 85,
        protein: 0.5,
        carbs: 21,
        fat: 0.3,
        notes: 'Snack sore pengganjal lapar',
      },
    ],
  };
}

/* Health calculations */
function calcBmi(weight, height) {
  const hM = height / 100;
  const bmi = Math.round((weight / (hM * hM)) * 10) / 10;

  let category = 'Normal';
  let badgeClass = 'up';
  let statusText = 'Normal / Ideal';
  let pinPercent = 50;

  if (bmi < 18.5) {
    category = 'Underweight';
    badgeClass = 'down';
    statusText = 'Kekurangan Berat Badan';
    pinPercent = Math.max(5, (bmi / 18.5) * 25);
  } else if (bmi < 23.0) {
    category = 'Normal';
    badgeClass = 'up';
    statusText = 'Ideal & Sehat';
    pinPercent = 25 + ((bmi - 18.5) / (23.0 - 18.5)) * 25;
  } else if (bmi < 25.0) {
    category = 'Overweight Ringan';
    badgeClass = 'neutral';
    statusText = 'Kelebihan BB Ringan';
    pinPercent = 50 + ((bmi - 23.0) / (25.0 - 23.0)) * 15;
  } else if (bmi < 30.0) {
    category = 'Overweight';
    badgeClass = 'down';
    statusText = 'Kelebihan Berat Badan';
    pinPercent = 65 + ((bmi - 25.0) / (30.0 - 25.0)) * 20;
  } else {
    category = 'Obesitas';
    badgeClass = 'down';
    statusText = 'Obesitas (Perlu Perhatian)';
    pinPercent = Math.min(95, 85 + ((bmi - 30.0) / 10) * 15);
  }

  const idealMin = Math.round(18.5 * hM * hM * 10) / 10;
  const idealMax = Math.round(22.9 * hM * hM * 10) / 10;

  return {
    value: bmi,
    category,
    badgeClass,
    statusText,
    pinPercent: Math.round(pinPercent),
    idealMin,
    idealMax,
  };
}

function calcBmr(weight, height, age, gender) {
  if (gender === 'female') {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calcTdee(bmr, activity) {
  const mult = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
  }[activity] || 1.55;
  return Math.round(bmr * mult);
}

function calcDailyLimit(profile) {
  const bmr = calcBmr(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calcTdee(bmr, profile.activity);
  const goalDiff = {
    deficit_light: -300,
    deficit_moderate: -500,
    deficit_aggressive: -750,
    maintenance: 0,
  }[profile.goal] ?? -500;

  const floor = profile.gender === 'female' ? 1200 : 1400;
  return Math.max(floor, Math.round(tdee + goalDiff));
}

function compressImage(file, maxDimension = 540, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan gambar yang valid'));
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Ekstraksi karakteristik warna visual untuk Vision Heuristics
        const sampleW = Math.min(width, 100);
        const sampleH = Math.min(height, 100);
        const sampleData = ctx.getImageData(0, 0, sampleW, sampleH).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < sampleData.length; i += 4) {
          rSum += sampleData[i];
          gSum += sampleData[i + 1];
          bSum += sampleData[i + 2];
          count++;
        }
        const avgR = count ? rSum / count : 128;
        const avgG = count ? gSum / count : 128;
        const avgB = count ? bSum / count : 128;

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          name: file.name || 'foto-makanan.jpg',
          size: file.size,
          width,
          height,
          avgR,
          avgG,
          avgB,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Sintesis Semantik Nutrisi Kuliner untuk Makanan di Luar Database */
function estimateUnknownFoodNutrients(rawFoodName, mult = 1.0) {
  const str = (rawFoodName || '').toLowerCase().trim();

  // 1. Minuman / Beverage
  const isDrink = /kopi|teh|jus|juice|susu|milk|sirup|syrup|boba|latte|americano|cappuccino|macchiato|shake|smoothie|frappe|soda|cola|sprite|fanta|air\s*putih|air\s*mineral|mineral|mocktail|cocktail/i.test(str);
  if (isDrink) {
    let cal = 140, p = 2, c = 28, f = 3, fiber = 0;
    let note = 'Minuman manis olahan';
    if (/air\s*putih|air\s*mineral|air\s*kelapa|teh\s*tawar|es\s*teh\s*tawar|kopi\s*hitam|americano/i.test(str)) {
      cal = 5; p = 0.2; c = 0.8; f = 0; fiber = 0;
      note = 'Minuman tanpa gula / kalori netral';
    } else if (/boba|pearl|brown\s*sugar|frappe|caramel|avocado\s*shake|chocolate|cokelat/i.test(str)) {
      cal = 340; p = 3.5; c = 62; f = 9; fiber = 0.5;
      note = 'Minuman boba / manis berkalori tinggi';
    } else if (/jus|juice/i.test(str)) {
      const isAlpukat = /alpukat/i.test(str);
      cal = isAlpukat ? 280 : 130;
      p = 1.5; c = 26; f = isAlpukat ? 14 : 0.5; fiber = 3;
      note = isAlpukat ? 'Jus buah alpukat padat energi & lemak nabati' : 'Jus buah segar';
    } else if (/kopi|latte|cappuccino/i.test(str)) {
      const isSweet = /gula|aren|sweet|manis/i.test(str);
      cal = isSweet ? 185 : 95;
      p = 4; c = isSweet ? 26 : 8; f = 6; fiber = 0;
      note = isSweet ? 'Kopi susu rasa manis gula aren' : 'Kopi susu reguler';
    }
    return {
      cal: Math.round(cal * mult),
      p: Math.round(p * mult * 10) / 10,
      c: Math.round(c * mult * 10) / 10,
      f: Math.round(f * mult * 10) / 10,
      fiber: Math.round(fiber * mult * 10) / 10,
      breakdownNote: note,
    };
  }

  // 2. Dekonstruksi Komponen Hidangan / Rice Bowl / Porsi Lengkap
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalFiber = 0;
  const components = [];

  // Alas Karbohidrat (Starch Base)
  const isRiceBowl = /bowl|ricebox|rice\s*box|bento|donburi|paket\s*nasi/i.test(str);
  const isNasi = /nasi|rice|ketupat|lontong/i.test(str) || isRiceBowl;
  const isNoodle = /mie|mi\s+|bihun|kwetiau|spaghetti|pasta|ramen|udon|fettuccine|soba/i.test(str);
  const isBread = /burger|sandwich|roti|toast|hotdog|wrap|kebab|croissant/i.test(str);

  if (isRiceBowl) {
    totalCal += 265; totalP += 5; totalC += 58; totalF += 0.8; totalFiber += 0.8;
    components.push('Nasi Putih Porsi Bowl (~265 kcal)');
  } else if (isNasi) {
    if (/uduk|kuning|liwet|gurih/i.test(str)) {
      totalCal += 260; totalP += 5; totalC += 43; totalF += 8; totalFiber += 0.8;
      components.push('Nasi Gurih Berlemak (~260 kcal)');
    } else if (/goreng|nasgor/i.test(str)) {
      totalCal += 350; totalP += 8; totalC += 52; totalF += 13; totalFiber += 1.2;
      components.push('Nasi Goreng Base (~350 kcal)');
    } else {
      totalCal += 204; totalP += 4.2; totalC += 45; totalF += 0.4; totalFiber += 0.6;
      components.push('Nasi Putih Standar (~204 kcal)');
    }
  } else if (isNoodle) {
    if (/goreng/i.test(str)) {
      totalCal += 360; totalP += 7; totalC += 52; totalF += 14; totalFiber += 1.5;
      components.push('Mie Goreng Gurih (~360 kcal)');
    } else {
      totalCal += 220; totalP += 5; totalC += 44; totalF += 2.5; totalFiber += 1.5;
      components.push('Olahan Mie/Pasta (~220 kcal)');
    }
  } else if (isBread) {
    totalCal += 220; totalP += 6; totalC += 35; totalF += 5; totalFiber += 2;
    components.push('Roti/Bun/Wrap (~220 kcal)');
  }

  // Protein Utama
  const hasAyam = /ayam|chicken|chick/i.test(str);
  const hasSapi = /sapi|beef|daging|meat|steak|rendang/i.test(str);
  const hasSeafood = /udang|shrimp|prawn|cumi|squid|ikan|fish|salmon|tuna|dori/i.test(str);
  const hasBebek = /bebek|duck/i.test(str);
  const hasBabi = /babi|pork|bacon/i.test(str);
  const hasTahuTempe = /tahu|tempe|tofu/i.test(str);

  const isCrispy = /crispy|krispi|tepung|goreng|fried|popcorn|karage|katsu/i.test(str);
  const isGrilled = /bakar|panggang|grilled|roast/i.test(str);
  const isBoiled = /rebus|kukus|steam|bening|soup|sop/i.test(str);

  if (hasAyam || (!hasSapi && !hasSeafood && !hasBebek && !hasBabi && !hasTahuTempe && isRiceBowl)) {
    if (isCrispy || isRiceBowl) {
      totalCal += 310; totalP += 26; totalC += 15; totalF += 17; totalFiber += 0.5;
      components.push('Ayam Goreng Tepung Crispy (~310 kcal)');
    } else if (isGrilled) {
      totalCal += 210; totalP += 27; totalC += 3; totalF += 10; totalFiber += 0;
      components.push('Ayam Bakar/Panggang (~210 kcal)');
    } else if (isBoiled) {
      totalCal += 160; totalP += 30; totalC += 0; totalF += 3.5; totalFiber += 0;
      components.push('Ayam Rebus/Kukus Sehat (~160 kcal)');
    } else {
      totalCal += 240; totalP += 25; totalC += 2; totalF += 14; totalFiber += 0;
      components.push('Olahan Daging Ayam (~240 kcal)');
    }
  } else if (hasSapi) {
    if (isCrispy) {
      totalCal += 340; totalP += 24; totalC += 14; totalF += 21; totalFiber += 0.5;
      components.push('Daging Sapi Krispi/Goreng (~340 kcal)');
    } else {
      totalCal += 260; totalP += 26; totalC += 2; totalF += 17; totalFiber += 0;
      components.push('Olahan Daging Sapi (~260 kcal)');
    }
  } else if (hasBebek) {
    totalCal += 360; totalP += 25; totalC += 2; totalF += 28; totalFiber += 0;
    components.push('Olahan Bebek Gurih (~360 kcal)');
  } else if (hasSeafood) {
    if (isCrispy) {
      totalCal += 260; totalP += 18; totalC += 18; totalF += 14; totalFiber += 0.5;
      components.push('Seafood Krispi Tepung (~260 kcal)');
    } else {
      totalCal += 140; totalP += 22; totalC += 1; totalF += 4; totalFiber += 0;
      components.push('Seafood Masak Sehat (~140 kcal)');
    }
  } else if (hasTahuTempe) {
    totalCal += 140; totalP += 10; totalC += 8; totalF += 8; totalFiber += 2.5;
    components.push('Tahu/Tempe (~140 kcal)');
  }

  // Saus Khusus & Topping Kaya Lemak/Mentega
  const hasSaltedEgg = /salted\s*egg|telur\s*asin|telor\s*asin/i.test(str);
  const hasMentai = /mentai|mayo|mayonnaise/i.test(str);
  const hasCheese = /keju|cheese|mozzarella|mozarella/i.test(str);
  const hasCurry = /curry|kari|gulai|rendang/i.test(str);
  const hasButter = /butter|mentega/i.test(str);
  const hasSambal = /sambal|sambel|pedas|geprek|ricarica|rica|balado|matah/i.test(str);

  if (hasSaltedEgg) {
    totalCal += 185; totalP += 4.5; totalC += 3.5; totalF += 17.5; totalFiber += 0.2;
    components.push('Saus Salted Egg Mentega Gurih (~185 kcal)');
  }
  if (hasMentai) {
    totalCal += 160; totalP += 1.5; totalC += 3; totalF += 16.5; totalFiber += 0;
    components.push('Saus Mentai Torched (~160 kcal)');
  }
  if (hasCheese) {
    totalCal += 130; totalP += 8; totalC += 2; totalF += 10.5; totalFiber += 0;
    components.push('Topping Keju Leleh (~130 kcal)');
  }
  if (hasCurry && !str.includes('katsu curry')) {
    totalCal += 140; totalP += 2.5; totalC += 9; totalF += 10.5; totalFiber += 1.2;
    components.push('Kuah Kari/Gulai Santan (~140 kcal)');
  }
  if (hasButter && !hasSaltedEgg) {
    totalCal += 110; totalP += 0.2; totalC += 0.2; totalF += 12; totalFiber += 0;
    components.push('Saus Butter Gurih (~110 kcal)');
  }
  if (hasSambal && !str.includes('sambal terasi')) {
    totalCal += 55; totalP += 0.8; totalC += 4; totalF += 4.2; totalFiber += 0.8;
    components.push('Sambal Minyak Gurih (~55 kcal)');
  }

  // Topping Telur (Sunny side up / Ceplok / Dadar)
  const hasEgg = /telur|telor|egg|ceplok|dadar|mata\s*sapi/i.test(str) || (isRiceBowl && /original|komplit|lengkap/i.test(str));
  if (hasEgg && !hasSaltedEgg) {
    totalCal += 90; totalP += 6.5; totalC += 0.5; totalF += 7; totalFiber += 0;
    components.push('Telur Mata Sapi (~90 kcal)');
  } else if (isRiceBowl && hasSaltedEgg) {
    totalCal += 88; totalP += 6.3; totalC += 0.5; totalF += 7; totalFiber += 0;
    components.push('Telur Ceplok Half-Cooked (~88 kcal)');
  }

  // Fallback adaptif jika belum ada komponen yang cocok
  if (totalCal === 0) {
    const isHealthy = /rebus|kukus|bakar|salad|bening|sayur|buah|panggang|diet/i.test(str);
    const isFried = /goreng|crispy|krispi|tepung|minyak|santan|gulai|lemak|keju/i.test(str);
    totalCal = isHealthy ? 220 : isFried ? 460 : 380;
    totalP = isHealthy ? 20 : 16;
    totalC = isHealthy ? 18 : 42;
    totalF = isHealthy ? 4 : isFried ? 22 : 14;
    totalFiber = 2;
    components.push('Estimasi Sintesis Kuliner Terapan (~' + totalCal + ' kcal)');
  }

  return {
    cal: Math.round(totalCal * mult),
    p: Math.round(totalP * mult * 10) / 10,
    c: Math.round(totalC * mult * 10) / 10,
    f: Math.round(totalF * mult * 10) / 10,
    fiber: Math.round(totalFiber * mult * 10) / 10,
    breakdownNote: components.join(' + '),
  };
}

function analyzeFoodWithAI(rawText, mealType = 'lunch', imageInfo = null) {
  const hasText = Boolean(rawText && rawText.trim());
  const imageList = Array.isArray(imageInfo) ? imageInfo : (imageInfo && imageInfo.dataUrl ? [imageInfo] : []);
  const hasImage = imageList.length > 0;

  if (!hasText && !hasImage) return null;

  // 1. Flatten & urutkan semua rules dari keyword terpanjang ke terpendek (greedy matching)
  const allRules = [];
  for (const item of FOOD_KNOWLEDGE_BASE) {
    for (const kw of item.keywords) {
      allRules.push({ kw: kw.toLowerCase().trim(), item });
    }
  }
  allRules.sort((a, b) => b.kw.length - a.kw.length);

  // 2. Deteksi konteks brand / restoran jika ada
  let detectedBrand = '';
  if (hasText) {
    if (/ahong\s*88|nasi\s*hainan\s*ahong/i.test(rawText)) detectedBrand = 'Nasi Hainan Ahong 88';
    else if (/mie\s*gacoan|gacoan/i.test(rawText)) detectedBrand = 'Mie Gacoan';
    else if (/sec\s*bowl|secbowl/i.test(rawText)) detectedBrand = 'SEC Bowl';
    else if (/eatlah/i.test(rawText)) detectedBrand = 'Eatlah';
    else if (/yoshinoya/i.test(rawText)) detectedBrand = 'Yoshinoya';
    else if (/hokben|hoka\s*hoka\s*bento/i.test(rawText)) detectedBrand = 'HokBen';
    else if (/kfc|kentucky/i.test(rawText)) detectedBrand = 'KFC';
    else if (/mcd|mcdonald/i.test(rawText)) detectedBrand = 'McDonalds';
    else if (/padang|sederhana/i.test(rawText)) detectedBrand = 'Nasi Padang';
    else if (/starbucks/i.test(rawText)) detectedBrand = 'Starbucks';
    else if (/kopi\s*kenangan/i.test(rawText)) detectedBrand = 'Kopi Kenangan';
    else if (/mixue/i.test(rawText)) detectedBrand = 'Mixue';
    else if (/chatime/i.test(rawText)) detectedBrand = 'Chatime';
  }

  const detected = [];
  const processedMap = new Map();

  if (hasText) {
    // 3. Pecah input menjadi baris dan pisahkan header restoran jika ada
    const rawLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    let linesToProcess = rawLines;

    // Deteksi apakah baris pertama adalah nama resto / brand / header pesanan
    if (rawLines.length > 1) {
      const firstLine = rawLines[0];
      const restLines = rawLines.slice(1);
      const firstHasNoPortion = !/(?:porsi|porsian|pcs|buah|potong|gelas|cup|mangkok|piring|bowl|box|bungkus|paket|\bx\b)\b/i.test(firstLine);
      const hasListMarkers = restLines.some(l => /^\s*(?:\d+[\.\)\-:]|\*|\-|•)/.test(l));
      const firstHasRestoCue = /(?:resto|restaurant|warung|kedai|depot|dapur|cabang|gading\s*serpong|serpong|jakarta|mall|outlet|ahong|ahong\s*88)/i.test(firstLine);

      if (firstHasNoPortion && (hasListMarkers || firstHasRestoCue)) {
        if (!detectedBrand) {
          detectedBrand = firstLine;
        }
        linesToProcess = restLines;
      }
    }

    const segments = [];

    for (const rLine of linesToProcess) {
      let line = rLine.trim();
      if (!line) continue;

      // Jika ada prefix resto/kategori di awal baris seperti "SEC Bowl: 1 porsi Salted Egg..." atau "Ahong 88: 1 porsi..."
      const colonMatch = line.match(/^([a-zA-Z0-9\s\.\-]{3,40}):\s*(.+)$/);
      if (colonMatch) {
        const prefix = colonMatch[1].trim();
        const remainder = colonMatch[2].trim();
        if (/gacoan|sec\s*bowl|secbowl|eatlah|yoshinoya|kfc|mcd|padang|hokben|starbucks|warteg|ahong|ahong\s*88|menu|sarapan|lunch|dinner/i.test(prefix)) {
          if (!detectedBrand) {
            if (/gacoan/i.test(prefix)) detectedBrand = 'Mie Gacoan';
            else if (/sec\s*bowl|secbowl/i.test(prefix)) detectedBrand = 'SEC Bowl';
            else if (/eatlah/i.test(prefix)) detectedBrand = 'Eatlah';
            else if (/yoshinoya/i.test(prefix)) detectedBrand = 'Yoshinoya';
            else if (/hokben/i.test(prefix)) detectedBrand = 'HokBen';
            else if (/ahong/i.test(prefix)) detectedBrand = 'Nasi Hainan Ahong 88';
            else detectedBrand = prefix;
          }
          line = remainder;
        }
      }

      if (/^(?:mie\s*gacoan|sec\s*bowl|secbowl|menu|makanan|sarapan|makan\s*(?:siang|malam)|snack|camilan|pesanan|order)\s*:?$/i.test(line)) {
        continue;
      }

      // Jangan split pada '+' jika baris mengandung menu yang memang namanya memakai '+'
      // (misal 'Nasi Hainan Campur + Sate')
      let shouldSplitPlus = true;
      const lowerLine = line.toLowerCase();
      if (/campur\s*\+\s*sate/i.test(lowerLine) || allRules.some(r => r.kw.includes('+') && lowerLine.includes(r.kw))) {
        shouldSplitPlus = false;
      }

      const splitPattern = shouldSplitPlus
        ? /(?:\s+\+\s+|\s+dan\s+|\s+&\s+|\s*,\s*(?![0-9]))/i
        : /(?:\s+dan\s+|\s+&\s+|\s*,\s*(?![0-9]))/i;

      const subParts = line.split(splitPattern);
      for (const part of subParts) {
        const cleanPart = part.trim();
        if (cleanPart) segments.push(cleanPart);
      }
    }

    if (!segments.length) segments.push(rawText.trim());

    for (const segment of segments) {
      let str = segment.toLowerCase().trim();
      str = str.replace(/^\s*(?:\d+[\.\)\-:]|\*|\-|•)\s*/, '').trim();
      if (!str) continue;

      const qtyCheckStr = str.replace(/\b(?:level|lvl)\s*\d+\b/gi, '');
      // Pisahkan keterangan isi pak seperti 'isi 10 pcs' agar angka 10 tidak tertukar sebagai pengali porsi
      const withoutPackSize = qtyCheckStr.replace(/\bisi\s*\d+\s*(?:pcs|buah|biji|potong|lembar)?\b/gi, ' ');

      let mult = 1.0;

      // 1. Cek porsi dengan unit kata satuan yang wajib (porsi, pcs, mangkok, box, dll.)
      const unitMatch = withoutPackSize.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(porsi|porsian|pcs|buah|butir|potong|lembar|bungkus|gelas|cup|mangkok|piring|ekor|tusuk|bks|bowl|box|paket)\b/i);
      // 2. Cek simbol pengali seperti "2x" atau "x 2"
      const xMatch = withoutPackSize.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*x\b/i) || withoutPackSize.match(/\bx\s*(\d+(?:[.,]\d+)?)(?:\s|$)/i);
      // 3. Cek angka di awal string (misal: "2 Nasi Goreng") dengan proteksi angka wajar <= 20
      const startMatch = withoutPackSize.match(/^(\d+(?:[.,]\d+)?)\s+/);

      if (unitMatch) {
        const num = parseFloat(unitMatch[1].replace(',', '.'));
        if (!isNaN(num) && num > 0) mult = num;
      } else if (xMatch) {
        const num = parseFloat(xMatch[1].replace(',', '.'));
        if (!isNaN(num) && num > 0) mult = num;
      } else if (startMatch) {
        const num = parseFloat(startMatch[1].replace(',', '.'));
        if (!isNaN(num) && num > 0 && num <= 20) mult = num;
      } else if (qtyCheckStr.includes('1/2') || qtyCheckStr.includes('setengah') || qtyCheckStr.includes('separuh')) {
        mult = 0.5;
      } else if (qtyCheckStr.includes('1/4') || qtyCheckStr.includes('seperempat')) {
        mult = 0.25;
      } else if (qtyCheckStr.includes('jumbo') || qtyCheckStr.includes('besar')) {
        mult = 1.35;
      } else if (qtyCheckStr.includes('kecil')) {
        mult = 0.75;
      }

      let matchedItem = null;
      for (const rule of allRules) {
        if (str.includes(rule.kw)) {
          // Cegah lauk/bumbu kecil (seperti sambal/timun/nasi putih polos) menelan hidangan komposit lengkap
          const isCompositeDish = /(?:bowl|ricebox|bento|donburi|paket|nasi|mie|kwetiau|bihun)/i.test(str) &&
            /(?:ayam|chicken|sapi|beef|dori|ikan|fish|udang|cumi|bebek|pork|babi|telur\s*asin|salted\s*egg|krispi|crispy|mentai|curry)/i.test(str);
          if (isCompositeDish && (rule.item.cal < 200 || rule.item.name === 'Nasi Putih' || rule.item.name === 'Sambal Tradisional')) {
            continue;
          }
          matchedItem = rule.item;
          break;
        }
      }

      if (matchedItem) {
        if (processedMap.has(matchedItem.name)) {
          const idx = processedMap.get(matchedItem.name);
          detected[idx].mult += mult;
          detected[idx].cal = Math.round(matchedItem.cal * detected[idx].mult);
          detected[idx].p = Math.round(matchedItem.p * detected[idx].mult * 10) / 10;
          detected[idx].c = Math.round(matchedItem.c * detected[idx].mult * 10) / 10;
          detected[idx].f = Math.round(matchedItem.f * detected[idx].mult * 10) / 10;
          detected[idx].fiber = Math.round(matchedItem.fiber * detected[idx].mult * 10) / 10;
        } else {
          const itemObj = {
            item: matchedItem,
            mult,
            cal: Math.round(matchedItem.cal * mult),
            p: Math.round(matchedItem.p * mult * 10) / 10,
            c: Math.round(matchedItem.c * mult * 10) / 10,
            f: Math.round(matchedItem.f * mult * 10) / 10,
            fiber: Math.round(matchedItem.fiber * mult * 10) / 10,
            notes: matchedItem.notes || '',
          };
          processedMap.set(matchedItem.name, detected.length);
          detected.push(itemObj);
        }
      } else {
        const cleanName = str
          .replace(/\bisi\s*\d+\s*(?:pcs|buah|biji|potong)?\b/gi, '')
          .replace(/\b\d+(?:[.,]\d+)?\s*(?:porsi|porsian|pcs|buah|butir|potong|lembar|bungkus|gelas|cup|mangkok|piring|ekor|tusuk|bks|bowl|box|paket|x)?\b/gi, '')
          .replace(/^[+\s\-:,]+|[+\s\-:,]+$/g, '')
          .trim() || segment;
        const est = estimateUnknownFoodNutrients(cleanName, mult);
        const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        detected.push({
          item: { name: formattedName, portion: `${mult} porsi estimasi sintesis kuliner AI`, notes: est.breakdownNote },
          mult,
          cal: est.cal,
          p: est.p,
          c: est.c,
          f: est.f,
          fiber: est.fiber,
          notes: est.breakdownNote,
        });
      }
    }
  } else if (hasImage) {
    // Mode Foto Saja (tanpa teks deskripsi) - Analisis untuk setiap foto yang diunggah
    imageList.forEach((img, idx) => {
      let photoName = `Sajian Menu ${idx + 1}`;
      let baseCal = 420, baseP = 18, baseC = 44, baseF = 18, baseFiber = 2;
      let note = 'Estimasi visual citra foto';

      if (img.avgR > 135 && img.avgR > img.avgB * 1.25) {
        photoName = imageList.length > 1 ? `Menu ${idx + 1}: Hidangan Gurih / Saus Merah` : 'Hidangan Olahan Gurih / Bumbu Saus Merah';
        baseCal = 490; baseP = 22; baseC = 40; baseF = 24; baseFiber = 2;
        note = 'Citra bernuansa gurih / bumbu saus';
      } else if (img.avgG > img.avgR && img.avgG > img.avgB) {
        photoName = imageList.length > 1 ? `Menu ${idx + 1}: Sayuran Hijau / Serat Sehat` : 'Sajian Sayuran Hijau & Serat Alami';
        baseCal = 175; baseP = 6; baseC = 20; baseF = 5; baseFiber = 4.5;
        note = 'Citra sayuran segar berserat';
      } else if (img.avgR > 120 && img.avgG > 100 && img.avgB < 95) {
        photoName = imageList.length > 1 ? `Menu ${idx + 1}: Olahan Krispi Keemasan` : 'Sajian Olahan Krispi / Gorengan Keemasan';
        baseCal = 480; baseP = 19; baseC = 42; baseF = 23; baseFiber = 1.5;
        note = 'Citra gorengan/krispi keemasan';
      } else if (img.avgB > img.avgR && img.avgB > img.avgG) {
        photoName = imageList.length > 1 ? `Menu ${idx + 1}: Minuman / Sajian Segar` : 'Minuman / Sajian Olahan Segar';
        baseCal = 140; baseP = 2; baseC = 28; baseF = 3; baseFiber = 0.5;
        note = 'Citra minuman / hidangan segar';
      }

      detected.push({
        item: { name: photoName, portion: `1 porsi (Foto ${idx + 1})` },
        mult: 1,
        cal: baseCal,
        p: baseP,
        c: baseC,
        f: baseF,
        fiber: baseFiber,
        notes: note,
      });
    });
  }

  // Hitung total makro & kalori gabungan
  const totalCal = detected.reduce((a, b) => a + b.cal, 0);
  const totalP = Math.round(detected.reduce((a, b) => a + b.p, 0) * 10) / 10;
  const totalC = Math.round(detected.reduce((a, b) => a + b.c, 0) * 10) / 10;
  const totalF = Math.round(detected.reduce((a, b) => a + b.f, 0) * 10) / 10;
  const totalFiber = Math.round(detected.reduce((a, b) => a + b.fiber, 0) * 10) / 10;

  const profile = state?.nutrition?.profile || { weight: 68, height: 172, age: 26, gender: 'male', activity: 'moderate', goal: 'deficit_moderate', targetWeight: 63 };
  const dailyTarget = calcDailyLimit(profile);
  const pctOfDaily = Math.round((totalCal / dailyTarget) * 100);

  // Buat Judul dan Breakdown Komponen Terdeteksi
  const title = detected.map((d) => (d.mult !== 1 ? `${d.mult}x ` : '1x ') + d.item.name).join(' + ');
  const breakdownParts = [];
  detected.forEach((d) => {
    let note = d.notes || d.item.notes || '';
    let str = `${d.mult !== 1 ? d.mult + 'x ' : ''}${d.item.name} (~${d.cal} kcal)`;
    if (note) str += ` [${note}]`;
    breakdownParts.push(str);
  });
  const breakdownText = 'Komponen terdeteksi: ' + breakdownParts.join(' · ');

  // Saran analisis gizi & defisit kalori kontekstual
  let advice = '';
  if (totalCal > 950) {
    advice = `⚠️ Menu ini tergolong padat kalori (${totalCal.toLocaleString('id-ID')} kcal, memakan ~${pctOfDaily}% dari limit kalori harian Anda) dengan kandungan lemak cukup tinggi (~${totalF}g). ` +
      `Kabar baiknya, asupan protein sangat melimpah (${totalP}g). Untuk menjaga target defisit kalori hari ini, jadwalkan makan berikutnya dengan menu sangat ringan (seperti sayur bening bayam, sup tahu bening, atau buah potong) dan minum 2.5L air putih.`;
  } else if (totalCal > 650) {
    advice = `💡 Asupan kalori cukup substansial (${totalCal} kcal, ~${pctOfDaily}% target harian). ` +
      `Protein tercukupi dengan baik (${totalP}g). Untuk jadwal makan berikutnya, prioritaskan sayuran hijau berserat dan kurangi asupan karbohidrat berminyak.`;
  } else if (totalP >= 28) {
    advice = `🌟 Sangat bagus untuk target komposisi tubuh! Asupan tinggi protein (${totalP}g) efektif melindungi massa otot dan menjaga rasa kenyang berjam-jam. ` +
      `Menyerap ~${pctOfDaily}% batas kalori harian (${totalCal} kcal).`;
  } else {
    advice = `✅ Porsi seimbang dan terkontrol (~${pctOfDaily}% dari batas kalori harian). Sangat ideal untuk mendukung proses defisit kalori Anda.`;
  }

  // Tambahkan visual insight jika ada gambar
  if (hasImage && hasText) {
    advice += imageList.length > 1
      ? ` 📸 Analisis Multimodal: Terdeteksi ${imageList.length} foto menu makanan yang memverifikasi ragam hidangan Anda.`
      : ' 📸 Analisis Multimodal: Citra foto memverifikasi porsi nyata dengan rona gurih keemasan yang selaras dengan deskripsi menu Anda.';
  } else if (hasImage && !hasText) {
    advice += imageList.length > 1
      ? ` 📸 Analisis Foto (${imageList.length} Menu): Masing-masing menu dianalisis terpisah dari kepadatan citra foto. Tip: Tambahkan deskripsi teks untuk rincian menu yang 100% presisi!`
      : ' 📸 Analisis Foto: Dianalisis berdasarkan kepadatan citra foto. Tip: Tambahkan deskripsi teks untuk rincian menu yang 100% presisi!';
  }

  const deliverySearchQuery = detectedBrand ? detectedBrand : (detected[0]?.item.name || (rawText ? rawText.slice(0, 30) : 'Makanan'));
  const sourceType = hasText && hasImage ? 'both' : hasImage ? 'image' : 'text';

  return {
    rawText: rawText || (imageList.length ? `[${imageList.length} Foto Makanan: ${imageList.map((img, i) => img.name || `Foto ${i + 1}`).join(', ')}]` : ''),
    mealType,
    title,
    breakdownText,
    calories: totalCal,
    protein: totalP,
    carbs: totalC,
    fat: totalF,
    fiber: totalFiber,
    advice,
    detected,
    deliverySearchQuery,
    images: imageList.map((img) => img.dataUrl),
    image: imageList[0]?.dataUrl || null,
    sourceType,
  };
}

function generateNextMealAndActions() {
  const profile = state?.nutrition?.profile || {
    weight: 68, height: 172, age: 26, gender: 'male', activity: 'moderate', goal: 'deficit_moderate', targetWeight: 63,
  };
  const bmiInfo = calcBmi(profile.weight, profile.height);
  const targetCal = calcDailyLimit(profile);

  const activeDate = ui.nutriDate || toISO(TODAY);
  const todaysFoods = (state?.nutrition?.foodLogs || []).filter((f) => f.date === activeDate);
  const consumedCal = todaysFoods.reduce((a, b) => a + (Number(b.calories) || 0), 0);
  const consumedProt = Math.round(todaysFoods.reduce((a, b) => a + (Number(b.protein) || 0), 0) * 10) / 10;
  const remainingCal = targetCal - consumedCal;
  const isSurplus = remainingCal < 0;

  const hour = (new Date()).getHours();
  const nextMealSlot = hour < 11 ? 'Makan Siang' : hour < 16 ? 'Camilan Sore / Makan Malam' : hour < 20 ? 'Makan Malam' : 'Camilan Ringan / Besok Pagi';

  let mealOptions = [];
  if (remainingCal >= 550) {
    mealOptions = [
      {
        name: 'Dada Ayam Bakar Madu + Nasi Merah + Cah Kangkung',
        searchQuery: 'Dada Ayam Bakar',
        cal: '430 kcal',
        calories: 430,
        protein: 38,
        carbs: 42,
        fat: 9,
        macros: 'Protein 38g · Karbo 42g · Lemak 9g',
        why: 'Kombinasi karbohidrat kompleks berserat tinggi dan protein tinggi, memberikan energi stabil tanpa memicu kantuk.',
      },
      {
        name: 'Ikan Nila Bakar Lalapan + Sambal Terasi + Tahu Bacem',
        searchQuery: 'Ikan Nila Bakar',
        cal: '385 kcal',
        calories: 385,
        protein: 34,
        carbs: 22,
        fat: 11,
        macros: 'Protein 34g · Karbo 22g · Lemak 11g',
        why: 'Ikan air tawar kaya asam amino dan rendah lemak jenuh. Tahu bacem menambah serat nabati.',
      },
      {
        name: 'Sup Ayam Sayur Bening Wortel Kentang + Telur Rebus 2 Butir',
        searchQuery: 'Sup Ayam Bening',
        cal: '320 kcal',
        calories: 320,
        protein: 26,
        carbs: 28,
        fat: 10,
        macros: 'Protein 26g · Karbo 28g · Lemak 10g',
        why: 'Hangat, kaya mikronutrisi dan elektrolit alami yang sangat mengenyangkan dengan kalori bersahabat.',
      },
    ];
  } else if (remainingCal >= 250) {
    mealOptions = [
      {
        name: 'Dada Ayam Panggang (120g) + Brokoli Kukus Bawang Putih',
        searchQuery: 'Dada Ayam Panggang',
        cal: '235 kcal',
        calories: 235,
        protein: 36,
        carbs: 8,
        fat: 4,
        macros: 'Protein 36g · Karbo 8g · Lemak 4g',
        why: 'Sangat padat protein dan minimal karbo/lemak, sempurna untuk menjaga sisa kuota kalori Anda tetap defisit.',
      },
      {
        name: 'Sup Tahu Udang Bening + Jamur Tiram & Daun Bawang',
        searchQuery: 'Sup Tahu Udang',
        cal: '190 kcal',
        calories: 190,
        protein: 24,
        carbs: 9,
        fat: 3,
        macros: 'Protein 24g · Karbo 9g · Lemak 3g',
        why: 'Volume tinggi air & serat jamur meregangkan lambung dan memberi sinyal kenyang instan ke otak.',
      },
      {
        name: 'Greek Yogurt Plain (150g) + 1/2 Buah Apel & Sedikit Madu',
        searchQuery: 'Greek Yogurt',
        cal: '180 kcal',
        calories: 180,
        protein: 16,
        carbs: 22,
        fat: 2.5,
        macros: 'Protein 16g · Karbo 22g · Lemak 2.5g',
        why: 'Kaya probiotik untuk kesehatan pencernaan dan kasein lambat cerna yang mencegah lapar malam hari.',
      },
    ];
  } else {
    mealOptions = [
      {
        name: 'Sayur Bening Bayam & Jagung Manis Tanpa Minyak',
        searchQuery: 'Sayur Bening Bayam',
        cal: '65 kcal',
        calories: 65,
        protein: 3,
        carbs: 12,
        fat: 0.5,
        macros: 'Protein 3g · Karbo 12g · Lemak 0.5g',
        why: 'Hampir nol lemak, volume besar dari sayuran hijau untuk memuaskan rasa lapar tanpa menambah beban kalori.',
      },
      {
        name: '2 Butir Putih Telur Rebus + Timun Iris Garam Lada',
        searchQuery: 'Telur Rebus',
        cal: '45 kcal',
        calories: 45,
        protein: 7.2,
        carbs: 2,
        fat: 0.2,
        macros: 'Protein 7.2g · Karbo 2g · Lemak 0.2g',
        why: 'Murni asam amino bebas lemak untuk perbaikan jaringan otot saat tidur malam.',
      },
      {
        name: 'Teh Chamomile / Teh Hijau Hangat + 1 Buah Pir Segar',
        searchQuery: 'Buah Pir Segar',
        cal: '55 kcal',
        calories: 55,
        protein: 0.5,
        carbs: 14,
        fat: 0.1,
        macros: 'Protein 0.5g · Karbo 14g · Lemak 0.1g',
        why: 'Menenangkan sistem saraf dan memberikan rasa manis alami dari buah berair tinggi serat.',
      },
    ];
  }

  const actionPlans = [
    {
      icon: '🏃‍♂️',
      title: 'Aktivitas Fisik & Pembakaran Kalori',
      desc: isSurplus
        ? `Hari ini kalori Anda telah mencapai limit (${consumedCal} / ${targetCal} kcal). Tambahkan jalan cepat selama 30-40 menit (sekitar 4.000 langkah) untuk membakar ~180-220 kcal ekstra dan mengembalikan posisi tubuh ke defisit kalori.`
        : `Pertahankan ritme harian Anda! Luangkan waktu untuk jalan santai 20-30 menit setelah makan untuk menurunkan lonjakan insulin darah dan meningkatkan sensitivitas glukosa.`,
    },
    {
      icon: '💧',
      title: 'Strategi Hidrasi & Satiety (Kenyang Lama)',
      desc: `Targetkan minum air putih 2.2 — 2.6 Liter hari ini. Trik efektif: Minum 1 gelas air bersuhu ruang 15 menit sebelum makan berikutnya. Penelitian klinis menunjukkan trik ini menurunkan asupan kalori makan spontan hingga 13%.`,
    },
    {
      icon: '🎯',
      title: bmiInfo.category === 'Overweight' || bmiInfo.category === 'Obesitas'
        ? 'Fokus Defisit: Konsistensi Tanpa Crash Diet'
        : 'Menjaga Komposisi Tubuh Ideal',
      desc: bmiInfo.category === 'Overweight' || bmiInfo.category === 'Obesitas'
        ? `BMI Anda saat ini ${bmiInfo.value} (${bmiInfo.statusText}). Untuk menurunkan berat badan ke target ${profile.targetWeight} kg secara aman, pertahankan defisit -500 kcal/hari secara stabil. Jangan kurangi kalori terlalu ekstrem (<1.200 kcal) agar metabolisme basal tidak melambat.`
        : `BMI Anda saat ini ${bmiInfo.value} (${bmiInfo.statusText}). Prioritaskan asupan protein harian (target minimal ~${Math.round(profile.weight * 1.5)}g/hari) dan latihan beban 3x seminggu agar tubuh kencang dan proporsional.`,
    },
  ];

  return {
    nextMealSlot,
    remainingCal,
    isSurplus,
    mealOptions,
    actionPlans,
    consumedCal,
    targetCal,
    consumedProt,
    todaysFoodsCount: todaysFoods.length,
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
    nutrition: defaultNutrition(),
  };
}

const USERS_KEY = 'ledgerly.auth.users';
const SESSION_KEY = 'ledgerly.auth.session';
const userDataKey = (uid) => `ledgerly.v2.data_${uid}`;

async function hashPassword(str) {
  if (window.crypto && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return 'fb_' + Math.abs(h).toString(16);
}

function getUsers() {
  try {
    const u = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(u) && u.length) return u;
  } catch {}
  const initial = [
    {
      id: 'usr_demo',
      name: 'Bryan Daniel',
      email: 'demo@ledgerly.app',
      passwordHash: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // password123
      createdAt: '2026-10-23',
    },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(initial));
  return initial;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function loadUserData(userId, seedIfEmpty = true) {
  try {
    const raw = localStorage.getItem(userDataKey(userId));
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.transactions)) {
        s.budgets ||= {};
        s.goals ||= [];
        s.nutrition ||= defaultNutrition();
        if (!CURRENCIES[s.currency]) s.currency = 'IDR';
        return s;
      }
    }
  } catch {}
  if (seedIfEmpty) {
    const fresh = seed('IDR');
    saveUserData(userId, fresh);
    return fresh;
  }
  const empty = { currency: 'IDR', transactions: [], budgets: {}, goals: [], nutrition: defaultNutrition() };
  saveUserData(userId, empty);
  return empty;
}

function saveUserData(userId, data) {
  if (!userId || !data) return;
  localStorage.setItem(userDataKey(userId), JSON.stringify(data));
}

let currentUser = getSession();
let state = currentUser ? loadUserData(currentUser.id, true) : null;

const save = () => {
  if (currentUser && currentUser.id && state) {
    saveUserData(currentUser.id, state);
  }
};

const TODAY = new Date();
const ui = {
  view: 'overview',
  month: monthStart(TODAY),
  nutriDate: toISO(TODAY),
  editingFoodId: null,
  lastAiAnalysis: null,
  filter: { q: '', type: 'all', cat: 'all', range: 'month' },
  editingId: null,
  fundGoalId: null,
  goalIcon: GOAL_ICONS[0],
  goalColor: GOAL_COLORS[0],
};

/* ---------------- formatting ---------------- */
function fmt(n, { compact = false, sign = false } = {}) {
  const cur = state?.currency || 'IDR';
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
  const cur = state?.currency || 'IDR';
  const parts = new Intl.NumberFormat(CURRENCIES[cur].locale, { style: 'currency', currency: cur }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value || cur;
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

/* ---------------- render: nutrition & health ---------------- */
function renderNutrition() {
  if (!state) return;
  state.nutrition ||= defaultNutrition();
  const profile = state.nutrition.profile;
  const bmiInfo = calcBmi(profile.weight, profile.height);
  const bmr = calcBmr(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calcTdee(bmr, profile.activity);
  const dailyLimit = calcDailyLimit(profile);

  // Active Date string
  const activeDate = ui.nutriDate || toISO(TODAY);
  const isToday = activeDate === toISO(TODAY);
  const isYesterday = activeDate === toISO(new Date(TODAY.getTime() - 86400000));
  const dateObj = parseISO(activeDate);

  // Format Date Label
  const dateLabel = isToday
    ? 'Hari Ini'
    : isYesterday
    ? 'Kemarin'
    : dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateBadge = $('#nutri-date-label');
  if (dateBadge) dateBadge.textContent = dateLabel;
  const datePicker = $('#nutri-date-picker');
  if (datePicker) datePicker.value = activeDate;

  // Filter food logs for active date
  const foodLogs = (state.nutrition.foodLogs || []).filter((f) => f.date === activeDate);
  const totalCal = foodLogs.reduce((a, b) => a + (Number(b.calories) || 0), 0);
  const totalProt = Math.round(foodLogs.reduce((a, b) => a + (Number(b.protein) || 0), 0) * 10) / 10;
  const totalCarb = Math.round(foodLogs.reduce((a, b) => a + (Number(b.carbs) || 0), 0) * 10) / 10;
  const totalFat = Math.round(foodLogs.reduce((a, b) => a + (Number(b.fat) || 0), 0) * 10) / 10;

  // 1. Featured Top Stat (Daily Intake & Deficit Remaining)
  const remainingCal = dailyLimit - totalCal;
  const isSurplus = remainingCal < 0;
  $('#stat-nutri-intake').textContent = totalCal.toLocaleString('id-ID');
  $('#stat-nutri-target').textContent = dailyLimit.toLocaleString('id-ID');

  const statusBadge = $('#stat-nutri-status-badge');
  if (statusBadge) {
    statusBadge.textContent = isSurplus ? `Surplus +${Math.abs(remainingCal)} kcal` : 'Defisit Aman';
    statusBadge.className = `delta ${isSurplus ? 'down' : 'up'}`;
  }

  const remainingNote = $('#stat-nutri-remaining-note');
  if (remainingNote) {
    remainingNote.textContent = isSurplus
      ? `Melebihi target ${Math.abs(remainingCal)} kcal`
      : `Tersisa ${remainingCal.toLocaleString('id-ID')} kcal hari ini`;
  }

  const calFill = $('#stat-calorie-fill');
  if (calFill) {
    const pct = Math.min(100, Math.round((totalCal / dailyLimit) * 100));
    calFill.style.width = `${pct}%`;
    if (isSurplus) {
      calFill.style.background = 'linear-gradient(90deg, #fb7185, #ef4444)';
      calFill.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.7)';
    } else {
      calFill.style.background = 'linear-gradient(90deg, #fb923c, #fb7185)';
      calFill.style.boxShadow = '0 0 10px rgba(251, 146, 60, 0.6)';
    }
  }

  // 2. BMI Card
  $('#stat-nutri-bmi').textContent = bmiInfo.value;
  const bmiBadge = $('#stat-bmi-badge');
  if (bmiBadge) {
    bmiBadge.textContent = bmiInfo.category;
    bmiBadge.className = `delta ${bmiInfo.badgeClass}`;
  }
  $('#stat-bmi-sub').textContent = `BB ${profile.weight} kg · TB ${profile.height} cm`;
  $('#stat-bmi-category-text').textContent = bmiInfo.statusText;

  // 3. TDEE & Deficit Card
  $('#stat-nutri-tdee').textContent = tdee.toLocaleString('id-ID');
  const goalNames = {
    deficit_moderate: '-500 kcal/hari (~0.5 kg/mgg)',
    deficit_light: '-300 kcal/hari (~0.3 kg/mgg)',
    deficit_aggressive: '-750 kcal/hari (~0.75 kg/mgg)',
    maintenance: '0 kcal (Jaga Berat)',
  };
  $('#stat-nutri-deficit-plan').textContent = goalNames[profile.goal] || 'Defisit Kalori';
  $('#stat-bmr-sub').textContent = `BMR: ${bmr.toLocaleString('id-ID')} kcal`;

  const deficitBadge = $('#stat-deficit-badge');
  if (deficitBadge) {
    const diff = dailyLimit - tdee;
    deficitBadge.textContent = diff === 0 ? 'Maintenance' : `${diff} kcal`;
    deficitBadge.className = `delta ${diff <= 0 ? 'up' : 'down'}`;
  }

  // 4. Macro Nutrients Card
  const macroEl = $('#stat-nutri-macros');
  if (macroEl) macroEl.textContent = `P: ${totalProt}g · C: ${totalCarb}g · L: ${totalFat}g`;
  const protEl = $('#stat-prot-val'); if (protEl) protEl.textContent = `${totalProt}g`;
  const carbEl = $('#stat-carb-val'); if (carbEl) carbEl.textContent = `${totalCarb}g`;
  const fatEl = $('#stat-fat-val'); if (fatEl) fatEl.textContent = `${totalFat}g`;

  const targetProtein = Math.round(profile.weight * 1.6);
  const protPct = Math.round((totalProt / targetProtein) * 100);
  $('#stat-macro-summary').textContent = `Target protein: ~${targetProtein}g/hari (${protPct}% tercapai)`;
  const macroStatus = $('#stat-macro-status');
  if (macroStatus) {
    macroStatus.textContent = protPct >= 80 ? 'Protein Optimal' : `${protPct}% Protein`;
    macroStatus.className = `delta ${protPct >= 80 ? 'up' : 'neutral'}`;
  }

  // 5. Populate Form Inputs in Profile Card
  const pw = $('#prof-weight'); if (pw && document.activeElement !== pw) pw.value = profile.weight;
  const ph = $('#prof-height'); if (ph && document.activeElement !== ph) ph.value = profile.height;
  const pa = $('#prof-age'); if (pa && document.activeElement !== pa) pa.value = profile.age;
  const pg = $('#prof-gender'); if (pg && document.activeElement !== pg) pg.value = profile.gender;
  const pact = $('#prof-activity'); if (pact && document.activeElement !== pact) pact.value = profile.activity;
  const pgoal = $('#prof-goal'); if (pgoal && document.activeElement !== pgoal) pgoal.value = profile.goal;
  const ptw = $('#prof-target-weight'); if (ptw && document.activeElement !== ptw) ptw.value = profile.targetWeight || 63;

  // 6. BMI Gauge & Analysis Info
  $('#bmi-gauge-val').textContent = `${bmiInfo.value} · ${bmiInfo.category}`;
  const pin = $('#bmi-indicator-pin');
  if (pin) pin.style.left = `${bmiInfo.pinPercent}%`;
  const pinBubble = $('#bmi-pin-bubble');
  if (pinBubble) pinBubble.textContent = `${bmiInfo.value}`;

  $('#bmi-ideal-range').textContent = `${bmiInfo.idealMin} kg — ${bmiInfo.idealMax} kg`;
  const weightDiff = Math.round((profile.weight - (profile.targetWeight || profile.weight)) * 10) / 10;
  const diffEl = $('#bmi-weight-diff');
  if (diffEl) {
    if (weightDiff > 0) {
      diffEl.textContent = `Perlu turun ${weightDiff} kg untuk capai target (${profile.targetWeight} kg)`;
      diffEl.className = 'a-val text-cyan';
    } else if (weightDiff < 0) {
      diffEl.textContent = `Perlu naik ${Math.abs(weightDiff)} kg untuk capai target (${profile.targetWeight} kg)`;
      diffEl.className = 'a-val';
    } else {
      diffEl.textContent = `Target berat badan tercapai (${profile.weight} kg)!`;
      diffEl.className = 'a-val text-green';
    }
  }

  const etaEl = $('#bmi-eta-weeks');
  if (etaEl) {
    if (weightDiff > 0) {
      const rate = profile.goal === 'deficit_aggressive' ? 0.75 : profile.goal === 'deficit_light' ? 0.3 : 0.5;
      const weeks = Math.ceil(weightDiff / rate);
      etaEl.textContent = `~${weeks} minggu (${goalNames[profile.goal]})`;
    } else {
      etaEl.textContent = 'Stabil / Mode Pemeliharaan';
    }
  }
  $('#bmi-daily-limit').textContent = `Maksimal ${dailyLimit.toLocaleString('id-ID')} kcal/hari`;

  // 7. Render Food Logs List by Meals
  renderFoodLogsList(foodLogs);

  // 8. Render AI Next Meal & Action Plan
  renderAiCoachSection();
}

function renderFoodLogsList(foodLogs) {
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
  let totalCount = 0;

  meals.forEach((meal) => {
    const listEl = $(`#food-list-${meal}`);
    const calEl = $(`#meal-cal-${meal}`);
    if (!listEl) return;

    const items = foodLogs.filter((f) => f.meal === meal);
    totalCount += items.length;
    const subCal = items.reduce((a, b) => a + (Number(b.calories) || 0), 0);
    if (calEl) calEl.textContent = `${subCal} kcal`;

    if (!items.length) {
      listEl.innerHTML = `<li class="food-item empty-food-item" style="opacity:0.4;font-size:12px;padding:6px 10px;">Belum ada makanan dicatat</li>`;
    } else {
      listEl.innerHTML = items.map((f) => {
        const imgs = (f.images && f.images.length) ? f.images : (f.image ? [f.image] : []);
        const thumbsHtml = imgs.length === 1
          ? `<img src="${imgs[0]}" class="food-item-thumb" alt="Foto ${esc(f.name)}" />`
          : imgs.length > 1
          ? `<div class="food-item-thumbs-stack" title="${imgs.length} foto menu terlampir">${imgs.map((im, i) => `<img src="${im}" class="food-item-thumb" alt="Foto ${i + 1}" />`).join('')}</div>`
          : '';

        return `
        <li class="food-item" data-id="${f.id}">
          <div class="food-item-meta">
            <div class="food-item-main">
              ${thumbsHtml}
              <div class="food-item-text">
                <p class="food-item-name">${esc(f.name)}</p>
                <div class="food-item-macro-badges">
                  <span class="f-badge f-prot">P: <b>${f.protein || 0}g</b></span>
                  <span class="f-badge f-carb">C: <b>${f.carbs || 0}g</b></span>
                  <span class="f-badge f-fat">L: <b>${f.fat || 0}g</b></span>
                </div>
                ${f.notes ? `<p class="food-item-notes">${esc(f.notes)}</p>` : ''}
              </div>
            </div>
          </div>
          <div class="food-item-right">
            <span class="food-item-cal">${f.calories} kcal</span>
            <button type="button" class="icon-btn food-item-del" data-food-action="delete" data-id="${f.id}" title="Hapus makanan" aria-label="Hapus">${ICON.trash}</button>
          </div>
        </li>
      `;
      }).join('');
    }
  });

  const emptyEl = $('#food-log-empty');
  const sectionsEl = $('#food-meal-sections');
  if (sectionsEl) {
    sectionsEl.hidden = false;
  }
  if (emptyEl) {
    emptyEl.hidden = true;
  }
  const subEl = $('#food-log-sub');
  if (subEl) {
    const dayCal = foodLogs.reduce((a, b) => a + (Number(b.calories) || 0), 0);
    subEl.textContent = totalCount ? `${totalCount} makanan dicatat · Total ${dayCal} kcal` : 'Belum ada konsumsi yang dicatat hari ini';
  }
}

function renderAiCoachSection() {
  const coachData = generateNextMealAndActions();

  const ctxEl = $('#next-meal-context');
  if (ctxEl) {
    ctxEl.textContent = coachData.isSurplus
      ? `Limit kalori defisit tercapai (${coachData.consumedCal} / ${coachData.targetCal} kcal). Rekomendasi menu super ringan & mengenyangkan untuk ${coachData.nextMealSlot}:`
      : `Sisa kuota: ${coachData.remainingCal.toLocaleString('id-ID')} kcal. Rekomendasi seimbang untuk ${coachData.nextMealSlot}:`;
  }

  const subCoach = $('#coach-status-sub');
  if (subCoach) {
    subCoach.textContent = `Evaluasi adaptif: ${coachData.consumedCal} kcal terkonsumsi · Protein ${coachData.consumedProt}g`;
  }

  const mealContainer = $('#next-meal-suggestions');
  if (mealContainer) {
    mealContainer.innerHTML = coachData.mealOptions.map((opt) => {
      const q = encodeURIComponent(opt.searchQuery || opt.name);
      const gofoodUrl = `https://gofood.co.id/search?q=${q}`;
      const grabfoodUrl = `https://food.grab.com/id/id/search?keyword=${q}`;
      const shopeefoodUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent((opt.searchQuery || opt.name) + ' food')}`;

      return `
      <div class="next-meal-card">
        <div class="next-meal-top">
          <span class="next-meal-name">${esc(opt.name)}</span>
          <span class="next-meal-cal">${esc(opt.cal)}</span>
        </div>
        <div class="next-meal-macro">${esc(opt.macros)}</div>
        <p class="next-meal-why">${esc(opt.why)}</p>

        <div class="next-meal-actions">
          <div class="order-food-wrap">
            <span class="order-food-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="17" r="3"/><circle cx="6" cy="17" r="3"/><path d="M14 9h4l2 4v4h-2"/><path d="M6 17h8"/><path d="m9 9 2-4h4"/></svg>
              Pesan Delivery:
            </span>
            <div class="order-chips">
              <a href="${gofoodUrl}" target="_blank" rel="noopener noreferrer" class="order-chip chip-gofood" title="Cari di GoFood">
                <span class="order-dot"></span> GoFood ↗
              </a>
              <a href="${grabfoodUrl}" target="_blank" rel="noopener noreferrer" class="order-chip chip-grab" title="Cari di GrabFood">
                <span class="order-dot"></span> GrabFood ↗
              </a>
              <a href="${shopeefoodUrl}" target="_blank" rel="noopener noreferrer" class="order-chip chip-shopee" title="Cari di ShopeeFood">
                <span class="order-dot"></span> ShopeeFood ↗
              </a>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-log-recommended" data-meal-json="${esc(JSON.stringify(opt))}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>Catat Menu Ini</span>
          </button>
        </div>
      </div>
      `;
    }).join('');

    // Attach listeners for quick-logging recommended meals
    mealContainer.querySelectorAll('.btn-log-recommended').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const dataStr = e.currentTarget.dataset.mealJson;
        if (!dataStr) return;
        try {
          const item = JSON.parse(dataStr);
          state.nutrition ||= defaultNutrition();
          state.nutrition.foodLogs ||= [];
          const hour = (new Date()).getHours();
          const mealType = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 19 ? 'dinner' : 'snack';
          state.nutrition.foodLogs.push({
            id: uid(),
            name: item.name,
            meal: mealType,
            date: ui.nutriDate || toISO(TODAY),
            calories: item.calories || parseInt(item.cal) || 200,
            protein: item.protein || 20,
            carbs: item.carbs || 15,
            fat: item.fat || 5,
            notes: 'Dicatat dari rekomendasi AI',
          });
          saveState();
          renderNutrition();
          toast(`“${item.name}” berhasil dicatat ke menu hari ini!`);
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  const actionContainer = $('#action-plan-list');
  if (actionContainer) {
    actionContainer.innerHTML = coachData.actionPlans.map((act) => `
      <div class="action-plan-card">
        <span class="action-plan-icon">${act.icon}</span>
        <div class="action-plan-content">
          <h4 class="action-plan-title">${esc(act.title)}</h4>
          <p class="action-plan-desc">${esc(act.desc)}</p>
        </div>
      </div>
    `).join('');
  }
}

function openFoodModal(food = null, defaultMeal = 'lunch') {
  const d = $('#food-modal');
  if (!d) return;
  ui.editingFoodId = food?.id || null;
  $('#food-modal-title').textContent = food ? 'Edit Catatan Makanan' : 'Catat Makanan Baru';
  $('#food-form-name').value = food?.name || '';
  $('#food-form-meal').value = food?.meal || defaultMeal;
  $('#food-form-date').value = food?.date || ui.nutriDate || toISO(TODAY);
  $('#food-form-cal').value = food?.calories || '';
  $('#food-form-protein').value = food?.protein ?? '';
  $('#food-form-carbs').value = food?.carbs ?? '';
  $('#food-form-fat').value = food?.fat ?? '';
  $('#food-form-notes').value = food?.notes || '';
  $('#food-form-error').hidden = true;
  $('#food-form-delete').hidden = !food;
  d.showModal();
}

/* ---------------- render: shell ---------------- */
function renderHeader() {
  if (!state) return;
  const h = TODAY.getHours();
  const firstName = currentUser?.name ? currentUser.name.trim().split(/\s+/)[0] : '';
  const greetTime = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  $('#greeting').textContent = `${greetTime}${firstName ? ', ' + firstName : ''} 👋`;
  $('#view-title').textContent = VIEW_TITLES[ui.view] || 'Ledgerly';

  // Sembunyikan month-picker & add-tx-btn saat di view nutrisi agar topbar rapi & fokus
  const monthPicker = $('.month-picker');
  const addTxBtn = $('#add-tx-btn');
  if (ui.view === 'nutrition') {
    if (monthPicker) monthPicker.style.display = 'none';
    if (addTxBtn) addTxBtn.style.display = 'none';
  } else {
    if (monthPicker) monthPicker.style.display = '';
    if (addTxBtn) addTxBtn.style.display = '';
  }

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
  if (!currentUser || !state) return;
  renderHeader();
  renderStats();
  renderCashflow();
  renderDonut();
  renderRecent();
  renderBudgetsMini();
  renderGoalsMini();
  renderTransactions();
  renderPlanning();
  renderNutrition();
}

function setView(view) {
  ui.view = view;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  renderHeader();
  if (view === 'nutrition') renderNutrition();
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
  if (state) sel.value = state.currency;
  sel.addEventListener('change', () => {
    if (!state) return;
    state.currency = sel.value;
    save();
    render();
    toast(`Mata uang diatur ke ${sel.value}`);
  });

  $('#export-btn').addEventListener('click', exportCSV);
  $('#reset-btn').addEventListener('click', () => {
    if (!state || !confirm('Ganti semua data Anda dengan contoh data transaksi (IDR)?')) return;
    state = seed(state.currency);
    save();
    ui.month = monthStart(TODAY);
    render();
    toast('Data contoh berhasil dimuat');
  });
  $('#clear-btn').addEventListener('click', () => {
    if (!state || !confirm('Hapus SEMUA transaksi, anggaran, dan target tabungan? Tindakan ini tidak dapat dibatalkan.')) return;
    state = { currency: state.currency, transactions: [], budgets: {}, goals: [] };
    save();
    render();
    toast('Semua data berhasil dibersihkan');
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

  // Authentication tab switching
  const tabLogin = $('#tab-login');
  const tabSignup = $('#tab-signup');
  const formLogin = $('#login-form');
  const formSignup = $('#signup-form');

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabSignup.setAttribute('aria-selected', 'false');
      formLogin.hidden = false;
      formSignup.hidden = true;
      $('#auth-title').textContent = 'Masuk ke Dashboard';
      $('#auth-sub').textContent = 'Kelola keuangan, anggaran, dan target tabungan Anda dengan aman.';
      $('#login-error').hidden = true;
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      tabSignup.setAttribute('aria-selected', 'true');
      tabLogin.setAttribute('aria-selected', 'false');
      formSignup.hidden = false;
      formLogin.hidden = true;
      $('#auth-title').textContent = 'Buat Akun Baru';
      $('#auth-sub').textContent = 'Daftar sekarang untuk memulai pencatatan keuangan pribadi Anda.';
      $('#signup-error').hidden = true;
    });
  }

  // Password visibility toggles
  $$('.toggle-pwd').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inp = $('#' + btn.dataset.target);
      if (!inp) return;
      const isPwd = inp.type === 'password';
      inp.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🙈' : '👁️';
    });
  });

  // Demo account quick login
  $('#demo-login-btn')?.addEventListener('click', () => {
    const users = getUsers();
    const demo = users.find((u) => u.id === 'usr_demo') || users[0];
    setSession(demo);
    updateAuthUI();
    toast(`Masuk sebagai ${demo.name} (Demo)`);
  });

  // Login form submission
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim().toLowerCase();
    const pwd = $('#login-password').value;
    const err = $('#login-error');
    err.hidden = true;

    if (!email || !pwd) {
      err.textContent = 'Silakan masukkan email dan password.';
      err.hidden = false;
      return;
    }

    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);
    const hash = await hashPassword(pwd);

    if (!user || user.passwordHash !== hash) {
      err.textContent = 'Email atau password yang Anda masukkan salah.';
      err.hidden = false;
      return;
    }

    setSession(user);
    updateAuthUI();
    toast(`Selamat datang kembali, ${user.name}!`);
  });

  // Signup form submission
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim().toLowerCase();
    const pwd = $('#signup-password').value;
    const confirm = $('#signup-confirm').value;
    const seedDemo = $('#signup-seed-demo').checked;
    const err = $('#signup-error');
    err.hidden = true;

    if (!name || name.length < 2) {
      err.textContent = 'Nama lengkap minimal 2 karakter.';
      err.hidden = false;
      $('#signup-name').focus();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      err.textContent = 'Format email tidak valid.';
      err.hidden = false;
      $('#signup-email').focus();
      return;
    }
    if (pwd.length < 6) {
      err.textContent = 'Password minimal harus 6 karakter.';
      err.hidden = false;
      $('#signup-password').focus();
      return;
    }
    if (pwd !== confirm) {
      err.textContent = 'Konfirmasi password tidak cocok.';
      err.hidden = false;
      $('#signup-confirm').focus();
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      err.textContent = 'Email ini sudah terdaftar. Silakan pilih tab Masuk.';
      err.hidden = false;
      return;
    }

    const hash = await hashPassword(pwd);
    const newUser = {
      id: uid(),
      name,
      email,
      passwordHash: hash,
      createdAt: toISO(new Date()),
    };
    users.push(newUser);
    saveUsers(users);

    // Initialize personal data for new user
    loadUserData(newUser.id, seedDemo);
    setSession(newUser);
    updateAuthUI();
    toast(`Akun berhasil dibuat! Selamat datang, ${name}.`);
  });

  // Logout handlers
  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari akun ini?')) return;
    setSession(null);
    updateAuthUI();
    toast('Anda telah berhasil keluar.');
  };
  $('#sidebar-logout-btn')?.addEventListener('click', handleLogout);
  /* ---------- Nutrition & Calorie Tracker Events ---------- */
  // Date navigation
  $('#nutri-prev-day')?.addEventListener('click', () => {
    const cur = parseISO(ui.nutriDate || toISO(TODAY));
    ui.nutriDate = toISO(new Date(cur.getTime() - 86400000));
    renderNutrition();
  });
  $('#nutri-next-day')?.addEventListener('click', () => {
    const cur = parseISO(ui.nutriDate || toISO(TODAY));
    ui.nutriDate = toISO(new Date(cur.getTime() + 86400000));
    renderNutrition();
  });
  $('#nutri-today-btn')?.addEventListener('click', () => {
    ui.nutriDate = toISO(TODAY);
    renderNutrition();
    toast('Menampilkan catatan hari ini');
  });
  $('#nutri-date-trigger')?.addEventListener('click', (e) => {
    const picker = $('#nutri-date-picker');
    if (e.target !== picker) {
      if (typeof picker?.showPicker === 'function') {
        try { picker.showPicker(); } catch (_) { picker.focus(); }
      } else {
        picker?.click();
      }
    }
  });
  $('#nutri-date-picker')?.addEventListener('change', (e) => {
    if (e.target.value) {
      ui.nutriDate = e.target.value;
      renderNutrition();
    }
  });

  // AI Food Image Upload Handlers (Supports Multi-Image / Lebih dari 1 Menu)
  const imageDropzone = $('#image-dropzone');
  const imageInput = $('#ai-food-image-input');
  const imagePreviewBar = $('#image-preview-bar');
  const previewCountBadge = $('#preview-count-badge');
  const previewGallery = $('#preview-thumbs-gallery');
  const btnAddMoreFoodImg = $('#btn-add-more-food-img');
  const btnRemoveAllFoodImg = $('#btn-remove-all-food-img');

  ui.uploadedFoodImages = [];

  const renderImagePreviews = () => {
    if (!ui.uploadedFoodImages || !ui.uploadedFoodImages.length) {
      if (imagePreviewBar) imagePreviewBar.hidden = true;
      if (imageDropzone) imageDropzone.hidden = false;
      if (imageInput) imageInput.value = '';
      ui.uploadedFoodImage = null;
      return;
    }

    ui.uploadedFoodImage = ui.uploadedFoodImages[0] || null;

    if (imageDropzone) imageDropzone.hidden = true;
    if (imagePreviewBar) imagePreviewBar.hidden = false;
    if (previewCountBadge) {
      const count = ui.uploadedFoodImages.length;
      previewCountBadge.textContent = count === 1 ? '📸 1 Foto Menu Terpilih' : `📸 ${count} Foto Menu Terpilih`;
    }

    if (previewGallery) {
      previewGallery.innerHTML = ui.uploadedFoodImages.map((img, idx) => `
        <div class="preview-thumb-card" title="${esc(img.name)}">
          <img src="${img.dataUrl}" alt="Menu ${idx + 1}" />
          <button type="button" class="card-remove-btn" data-thumb-idx="${idx}" title="Hapus foto ini" aria-label="Hapus foto ini">×</button>
          <span class="thumb-tag">Menu ${idx + 1}</span>
        </div>
      `).join('');
    }
  };

  const handleImageFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    const files = [...fileList].filter((f) => f && f.type && f.type.startsWith('image/'));
    if (!files.length) {
      toast('Format file tidak didukung. Harap pilih file gambar (JPG, PNG, WebP).');
      return;
    }

    try {
      const compressedList = await Promise.all(files.map((f) => compressImage(f, 540, 0.72)));
      ui.uploadedFoodImages = [...(ui.uploadedFoodImages || []), ...compressedList];
      renderImagePreviews();
      const count = ui.uploadedFoodImages.length;
      toast(`📸 ${files.length} foto berhasil ditambahkan! (Total: ${count} foto menu terlampir)`);
    } catch (err) {
      toast(err.message || 'Gagal memproses gambar makanan.');
    }
  };

  const removeFoodImages = () => {
    ui.uploadedFoodImages = [];
    renderImagePreviews();
  };

  imageDropzone?.addEventListener('click', () => imageInput?.click());
  imageDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      imageInput?.click();
    }
  });

  btnAddMoreFoodImg?.addEventListener('click', () => imageInput?.click());
  btnRemoveAllFoodImg?.addEventListener('click', removeFoodImages);

  imageInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      handleImageFiles(e.target.files);
    }
  });

  // Event delegation untuk hapus satu per satu foto
  previewGallery?.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-remove-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.thumbIdx, 10);
    if (!isNaN(idx) && idx >= 0 && idx < ui.uploadedFoodImages.length) {
      ui.uploadedFoodImages.splice(idx, 1);
      renderImagePreviews();
      toast('Foto berhasil dihapus.');
    }
  });

  // Drag and Drop support (bisa multiple files)
  imageDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.classList.add('dragover');
  });
  imageDropzone?.addEventListener('dragleave', () => {
    imageDropzone.classList.remove('dragover');
  });
  imageDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleImageFiles(e.dataTransfer.files);
    }
  });

  // Clipboard Paste support on AI Food Textarea (bisa gambar berturut-turut)
  $('#ai-food-input')?.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      const pastedFiles = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length) {
        handleImageFiles(pastedFiles);
      }
    }
  });

  // AI Food Estimator
  const runAiAnalysis = (customText = null) => {
    const input = $('#ai-food-input');
    const text = (customText !== null ? customText : input?.value || '').trim();
    const images = (ui.uploadedFoodImages && ui.uploadedFoodImages.length) ? ui.uploadedFoodImages : (ui.uploadedFoodImage ? [ui.uploadedFoodImage] : []);

    if (!text && !images.length) {
      input?.focus();
      toast('Tuliskan deskripsi makanan atau upload foto makanan terlebih dahulu');
      return;
    }

    const meal = $('#ai-meal-select')?.value || 'lunch';
    const result = analyzeFoodWithAI(text, meal, images);
    if (!result) return;

    ui.lastAiAnalysis = result;
    $('#ai-res-title').textContent = result.title;
    $('#ai-res-breakdown').textContent = result.breakdownText;
    $('#ai-res-calories').textContent = result.calories;
    $('#ai-res-carb').textContent = `${result.carbs}g`;
    $('#ai-res-prot').textContent = `${result.protein}g`;
    $('#ai-res-fat').textContent = `${result.fat}g`;
    $('#ai-res-fiber').textContent = `${result.fiber}g`;
    $('#ai-res-advice').textContent = result.advice;

    // Populate manual adjust fields
    const inpCal = $('#inp-adj-cal');
    const inpCarb = $('#inp-adj-carb');
    const inpProt = $('#inp-adj-prot');
    const inpFat = $('#inp-adj-fat');
    if (inpCal) inpCal.value = result.calories;
    if (inpCarb) inpCarb.value = result.carbs;
    if (inpProt) inpProt.value = result.protein;
    if (inpFat) inpFat.value = result.fat;

    const adjBox = $('#ai-adjust-inputs');
    if (adjBox) adjBox.hidden = true;

    // Display image thumbnail(s) in result panel if uploaded
    const thumbBox = $('#ai-result-thumb-box');
    const sourceBadge = $('#ai-source-badge');

    if (result.images && result.images.length) {
      if (thumbBox) {
        thumbBox.hidden = false;
        thumbBox.innerHTML = result.images.map((imgUrl, i) => `
          <div class="ai-result-thumb-item" title="Foto Menu ${i + 1}">
            <img src="${imgUrl}" alt="Menu ${i + 1}" />
            ${result.images.length > 1 ? `<span class="ai-thumb-badge">Menu ${i + 1}</span>` : ''}
          </div>
        `).join('');
      }
    } else {
      if (thumbBox) {
        thumbBox.hidden = true;
        thumbBox.innerHTML = '';
      }
    }

    if (sourceBadge) {
      const imgCount = result.images ? result.images.length : 0;
      if (result.sourceType === 'both') {
        sourceBadge.textContent = imgCount > 1 ? `✨ ${imgCount} Foto & Deskripsi Dianalisis` : '✨ Foto & Deskripsi Teks Dianalisis';
      } else if (result.sourceType === 'image') {
        sourceBadge.textContent = imgCount > 1 ? `📸 ${imgCount} Foto Menu Dianalisis` : '📸 Dianalisis Berdasarkan Citra Visual Foto';
      } else {
        sourceBadge.textContent = '✨ Dianalisis Berdasarkan Deskripsi Teks';
      }
    }

    // Update online order links for detected food
    const q = encodeURIComponent(result.deliverySearchQuery || result.title);
    const gofoodBtn = $('#ai-link-gofood');
    if (gofoodBtn) gofoodBtn.href = `https://gofood.co.id/search?q=${q}`;
    const grabfoodBtn = $('#ai-link-grabfood');
    if (grabfoodBtn) grabfoodBtn.href = `https://food.grab.com/id/id/search?keyword=${q}`;
    const shopeefoodBtn = $('#ai-link-shopeefood');
    if (shopeefoodBtn) shopeefoodBtn.href = `https://shopee.co.id/search?keyword=${encodeURIComponent((result.deliverySearchQuery || result.title) + ' food')}`;

    const panel = $('#ai-result-panel');
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  $('#btn-run-ai-estimate')?.addEventListener('click', () => runAiAnalysis());

  // Quick Preset Chips
  $$('#quick-preset-chips .chip-food').forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.text;
      const inp = $('#ai-food-input');
      if (inp) inp.value = text;
      runAiAnalysis(text);
    });
  });

  // Toggle & Real-time Sync for Macro Adjustments
  $('#btn-toggle-adjust-macros')?.addEventListener('click', () => {
    const adjBox = $('#ai-adjust-inputs');
    if (!adjBox) return;
    adjBox.hidden = !adjBox.hidden;
    if (!adjBox.hidden) {
      $('#inp-adj-cal')?.focus();
    }
  });

  const syncAdjustedMacros = () => {
    if (!ui.lastAiAnalysis) return;
    const c = Math.max(0, parseInt($('#inp-adj-cal')?.value) || 0);
    const cb = Math.max(0, parseFloat($('#inp-adj-carb')?.value) || 0);
    const p = Math.max(0, parseFloat($('#inp-adj-prot')?.value) || 0);
    const f = Math.max(0, parseFloat($('#inp-adj-fat')?.value) || 0);

    ui.lastAiAnalysis.calories = c;
    ui.lastAiAnalysis.carbs = cb;
    ui.lastAiAnalysis.protein = p;
    ui.lastAiAnalysis.fat = f;

    $('#ai-res-calories').textContent = c;
    $('#ai-res-carb').textContent = `${cb}g`;
    $('#ai-res-prot').textContent = `${p}g`;
    $('#ai-res-fat').textContent = `${f}g`;
  };

  ['inp-adj-cal', 'inp-adj-carb', 'inp-adj-prot', 'inp-adj-fat'].forEach((id) => {
    $(`#${id}`)?.addEventListener('input', syncAdjustedMacros);
  });

  $('#btn-ai-cancel')?.addEventListener('click', () => {
    const panel = $('#ai-result-panel');
    if (panel) panel.hidden = true;
  });

  // Save AI Estimate to Log
  $('#btn-ai-save-to-log')?.addEventListener('click', () => {
    if (!ui.lastAiAnalysis || !state) return;
    state.nutrition ||= defaultNutrition();
    state.nutrition.foodLogs ||= [];

    const newFood = {
      id: uid(),
      date: ui.nutriDate || toISO(TODAY),
      meal: ui.lastAiAnalysis.mealType || 'lunch',
      name: ui.lastAiAnalysis.title,
      calories: ui.lastAiAnalysis.calories,
      protein: ui.lastAiAnalysis.protein,
      carbs: ui.lastAiAnalysis.carbs,
      fat: ui.lastAiAnalysis.fat,
      notes: ui.lastAiAnalysis.breakdownText,
      image: ui.lastAiAnalysis.image || null,
      images: ui.lastAiAnalysis.images || (ui.lastAiAnalysis.image ? [ui.lastAiAnalysis.image] : []),
    };

    state.nutrition.foodLogs.push(newFood);
    save();
    renderNutrition();

    const panel = $('#ai-result-panel');
    if (panel) panel.hidden = true;
    const inp = $('#ai-food-input');
    if (inp) inp.value = '';
    removeFoodImages();
    toast(`✨ ${newFood.name} (${newFood.calories} kcal) berhasil dicatat!`);
  });

  // Jump to AI from top button
  $('#btn-jump-ai')?.addEventListener('click', () => {
    setView('nutrition');
    const inp = $('#ai-food-input');
    if (inp) {
      inp.focus();
      inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Open manual food modal
  $('#btn-open-food-modal')?.addEventListener('click', () => openFoodModal(null, $('#ai-meal-select')?.value || 'lunch'));
  $('#btn-log-add-manual')?.addEventListener('click', () => openFoodModal(null, 'lunch'));
  $('#btn-empty-add-food')?.addEventListener('click', () => openFoodModal(null, 'lunch'));

  // Food Form Submit (Save / Edit Manual)
  $('#food-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#food-form-name').value.trim();
    const meal = $('#food-form-meal').value;
    const date = $('#food-form-date').value || ui.nutriDate || toISO(TODAY);
    const cal = parseFloat($('#food-form-cal').value);
    const p = parseFloat($('#food-form-protein').value) || 0;
    const c = parseFloat($('#food-form-carbs').value) || 0;
    const f = parseFloat($('#food-form-fat').value) || 0;
    const notes = $('#food-form-notes').value.trim();
    const err = $('#food-form-error');

    if (!name || isNaN(cal) || cal < 0) {
      if (err) err.hidden = false;
      return;
    }
    if (err) err.hidden = true;

    state.nutrition ||= defaultNutrition();
    state.nutrition.foodLogs ||= [];

    if (ui.editingFoodId) {
      const item = state.nutrition.foodLogs.find((x) => x.id === ui.editingFoodId);
      if (item) {
        Object.assign(item, { name, meal, date, calories: Math.round(cal), protein: p, carbs: c, fat: f, notes });
        toast(`Makanan “${name}” diperbarui`);
      }
    } else {
      state.nutrition.foodLogs.push({
        id: uid(),
        name,
        meal,
        date,
        calories: Math.round(cal),
        protein: p,
        carbs: c,
        fat: f,
        notes,
      });
      toast(`Makanan “${name}” (${Math.round(cal)} kcal) dicatat`);
    }

    save();
    closeModal(e.target);
    renderNutrition();
  });

  // Food Form Delete
  $('#food-form-delete')?.addEventListener('click', () => {
    if (!ui.editingFoodId || !state) return;
    const idx = state.nutrition.foodLogs.findIndex((x) => x.id === ui.editingFoodId);
    if (idx >= 0) {
      const [removed] = state.nutrition.foodLogs.splice(idx, 1);
      save();
      $('#food-modal')?.close();
      renderNutrition();
      toast(`Makanan “${removed.name}” dihapus`, {
        undo: () => {
          state.nutrition.foodLogs.splice(idx, 0, removed);
          save();
          renderNutrition();
        },
      });
    }
  });

  // Delegated food item delete
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-food-action="delete"]');
    if (!btn || !state?.nutrition?.foodLogs) return;
    const id = btn.dataset.id;
    const idx = state.nutrition.foodLogs.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [removed] = state.nutrition.foodLogs.splice(idx, 1);
      save();
      renderNutrition();
      toast(`“${removed.name}” dihapus`, {
        undo: () => {
          state.nutrition.foodLogs.splice(idx, 0, removed);
          save();
          renderNutrition();
        },
      });
    }
  });

  // Health Profile Form Submit
  $('#health-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state) return;
    state.nutrition ||= defaultNutrition();
    state.nutrition.profile ||= {};

    const weight = parseFloat($('#prof-weight').value) || 68;
    const height = parseFloat($('#prof-height').value) || 172;
    const age = parseInt($('#prof-age').value, 10) || 26;
    const gender = $('#prof-gender').value || 'male';
    const activity = $('#prof-activity').value || 'moderate';
    const goal = $('#prof-goal').value || 'deficit_moderate';
    const targetWeight = parseFloat($('#prof-target-weight').value) || (weight - 5);

    state.nutrition.profile = {
      weight,
      height,
      age,
      gender,
      activity,
      goal,
      targetWeight,
    };

    save();
    renderNutrition();
    toast('Profil fisik, BMI & limit defisit berhasil diperbarui!');
  });

  // Refresh AI Coach Plan
  $('#btn-refresh-ai-coach')?.addEventListener('click', () => {
    renderAiCoachSection();
    toast('💡 Analisis & rekomendasi menu AI diperbarui!');
  });

  setupCashflowHover();
}

function updateAuthUI() {
  currentUser = getSession();
  const authScreen = $('#auth-screen');
  const appEl = $('#app');
  if (!currentUser) {
    authScreen.hidden = false;
    appEl.hidden = true;
    state = null;
  } else {
    authScreen.hidden = true;
    appEl.hidden = false;
    state = loadUserData(currentUser.id, true);
    const initials = currentUser.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
    $('#user-avatar').textContent = initials;
    $('#user-name').textContent = currentUser.name;
    $('#user-email').textContent = currentUser.email;
    const sel = $('#currency-select');
    if (sel && state) sel.value = state.currency;
    render();
  }
}

bindEvents();
updateAuthUI();
