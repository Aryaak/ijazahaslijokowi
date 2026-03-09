"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Item / Rarity System ─────────────────────────────────────────────────────
type Rarity = "umum" | "langka" | "epic" | "legend";

interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  dropWeight: number;
  description: string;
}

const ITEMS: ItemDef[] = [
  { id: "ikan",      name: "Ikan",                emoji: "🐟", rarity: "umum",   dropWeight: 30, description: "Ikan segar dari pasar pagi." },
  { id: "buku",      name: "Buku",                emoji: "📚", rarity: "umum",   dropWeight: 28, description: "Buku pelajaran penuh coretan." },
  { id: "pensil",    name: "Pensil",              emoji: "✏️", rarity: "umum",   dropWeight: 26, description: "Pensil 2B setengah terpakai." },
  { id: "susu",      name: "Susu",                emoji: "🥛", rarity: "umum",   dropWeight: 24, description: "Susu segar bergizi tinggi." },
  { id: "panci",     name: "Panci",               emoji: "🍳", rarity: "umum",   dropWeight: 22, description: "Panci masak anti lengket." },
  { id: "latolato",  name: "Lato Lato",           emoji: "⚫", rarity: "umum",   dropWeight: 20, description: "Mainan viral yang bikin berisik se-RT." },
  { id: "eskepalmilo", name: "Es Kepal Milo",     emoji: "🧇", rarity: "umum",   dropWeight: 18, description: "Es kepal Milo dingin dan manis, jajanan hits." },
  { id: "ompreng",   name: "Ompreng MBG",         emoji: "🍱", rarity: "langka", dropWeight: 10, description: "Ompreng MBG yang merupakan senjata terkuat WW3." },
  { id: "laptop",    name: "Laptop Chromebook",   emoji: "💻", rarity: "langka", dropWeight: 8,  description: "Chromebook tipis untuk kerja di mana saja." },
  { id: "kemeja",    name: "Kemeja Putih",        emoji: "👔", rarity: "langka", dropWeight: 7,  description: "Kemeja putih bersih tanpa noda." },
  { id: "peci",      name: "Peci",                emoji: "🎩", rarity: "langka", dropWeight: 6,  description: "Peci hitam khas, simbol kesopanan." },
  { id: "sarung",    name: "Sarung",              emoji: "🧣", rarity: "langka", dropWeight: 5,  description: "Sarung kotak-kotak serbaguna, bisa jadi apa saja." },
  { id: "sawit",     name: "Pohon Sawit",         emoji: "🌴", rarity: "epic",   dropWeight: 3,  description: "Pohon sawit penghasil minyak emas hijau." },
  { id: "kuda",      name: "Kuda",                emoji: "🐎", rarity: "epic",   dropWeight: 2,  description: "Kuda gagah berlari kencang di padang savana." },
  { id: "wayang",    name: "Dokumen Super Semar", emoji: "📜", rarity: "legend", dropWeight: 1,  description: "Manuskrip kuno berisikan perjanjian dewata, sangat langka!" },
  { id: "tembok",    name: "Tembok Ratapan",      emoji: "🧱", rarity: "legend", dropWeight: 1,  description: "Tembok keramat penuh doa dan air mata." },
];

const TOTAL_WEIGHT = ITEMS.reduce((s, i) => s + i.dropWeight, 0);
const ITEM_SPAWN_CHANCE = 0.12;

function pickRandomItem(): ItemDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const item of ITEMS) {
    r -= item.dropWeight;
    if (r <= 0) return item;
  }
  return ITEMS[0];
}

const RARITY_COLOR: Record<Rarity, string> = {
  umum:   "#94a3b8",
  langka: "#3b82f6",
  epic:   "#a855f7",
  legend: "#f59e0b",
};
const RARITY_LABEL: Record<Rarity, string> = {
  umum:   "Umum",
  langka: "Langka",
  epic:   "Epic",
  legend: "Legendaris",
};
const RARITY_GLOW: Record<Rarity, string> = {
  umum:   "rgba(148,163,184,0.5)",
  langka: "rgba(59,130,246,0.6)",
  epic:   "rgba(168,85,247,0.7)",
  legend: "rgba(245,158,11,0.8)",
};

// ─── Detect low-end device ────────────────────────────────────────────────────
function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as any;
  // Low memory or low CPU cores = low-end
  if (nav.deviceMemory && nav.deviceMemory <= 2) return true;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return true;
  // Small screen = likely mobile, treat as potentially low-end
  if (window.innerWidth <= 480) return true;
  return false;
}

// ─── Local Storage ────────────────────────────────────────────────────────────
function getOrCreateUID(): string {
  if (typeof window === "undefined") return "srv";
  let uid = localStorage.getItem("dokumen_uid");
  if (!uid) {
    uid = "u_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("dokumen_uid", uid);
  }
  return uid;
}
function storageKey(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return "inv_" + h.toString(36);
}
function loadInventory(): Record<string, number> {
  try {
    const uid = getOrCreateUID();
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const valid: Record<string, number> = {};
    for (const item of ITEMS) {
      if (typeof parsed[item.id] === "number") valid[item.id] = parsed[item.id];
    }
    return valid;
  } catch { return {}; }
}
function saveInventory(inv: Record<string, number>) {
  try {
    const uid = getOrCreateUID();
    localStorage.setItem(storageKey(uid), JSON.stringify(inv));
  } catch {}
}
function statsKey(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 17 + uid.charCodeAt(i)) >>> 0;
  return "stats_" + h.toString(36);
}
interface GameStats { totalTime: number; totalOpened: number; }
function loadStats(): GameStats {
  try {
    const uid = getOrCreateUID();
    const raw = localStorage.getItem(statsKey(uid));
    if (!raw) return { totalTime: 0, totalOpened: 0 };
    const p = JSON.parse(raw);
    return {
      totalTime:   typeof p.totalTime   === "number" ? p.totalTime   : 0,
      totalOpened: typeof p.totalOpened === "number" ? p.totalOpened : 0,
    };
  } catch { return { totalTime: 0, totalOpened: 0 }; }
}
function saveStats(s: GameStats) {
  try {
    const uid = getOrCreateUID();
    localStorage.setItem(statsKey(uid), JSON.stringify(s));
  } catch {}
}

// ─── Envelope type ────────────────────────────────────────────────────────────
interface Env {
  id: number;
  x: number;
  y: number;
  vx: number;
  wobble: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  scale: number;
  isReal: boolean;
  itemId: string | null;
  zonked: boolean;
  opened: boolean;
  shakeTimer: number;
  shakePhase: number;
  fadeTimer: number;
  opacity: number;
  row: number;
  isItemShake: boolean;
  itemOpenProgress: number;
  itemEmoji: string;
  itemRarity: Rarity | null;
}

const TOTAL = 30;
const ROWS  = 5;
const W = 90;
const H = 66;

// ─── Web Audio ───────────────────────────────────────────────────────────────
function makeAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); }
  catch { return null; }
}
function playOpen(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = "triangle"; osc.frequency.setValueAtTime(440, t); osc.frequency.exponentialRampToValueAtTime(660, t+0.08);
  g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
  osc.start(t); osc.stop(t+0.18);
}
function playZonk(ctx: AudioContext) {
  const t = ctx.currentTime;
  const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination); o1.type = "sawtooth";
  o1.frequency.setValueAtTime(180,t); o1.frequency.exponentialRampToValueAtTime(60,t+0.25);
  g1.gain.setValueAtTime(0.22,t); g1.gain.exponentialRampToValueAtTime(0.001,t+0.3);
  o1.start(t); o1.stop(t+0.3);
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination); o2.type = "square";
  o2.frequency.setValueAtTime(100,t); o2.frequency.exponentialRampToValueAtTime(50,t+0.2);
  g2.gain.setValueAtTime(0.1,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.22);
  o2.start(t); o2.stop(t+0.22);
}
function playWin(ctx: AudioContext) {
  [523,659,784,1047].forEach((freq,i) => {
    const t = ctx.currentTime + i*0.1;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine";
    o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35);
    o.start(t); o.stop(t+0.35);
  });
}
function playItem(ctx: AudioContext, rarity: Rarity) {
  const freqs: Record<Rarity, number[]> = {
    umum:   [523, 659],
    langka: [659, 784, 880],
    epic:   [784, 988, 1175, 1319],
    legend: [523, 659, 784, 988, 1175, 1319, 1568],
  };
  freqs[rarity].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.08;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t); o.stop(t + 0.3);
  });
}

// ─── OPTIMIZED Canvas draw ────────────────────────────────────────────────────
// Precompute shadow/color strings untuk tiap state (hindari string concat di render loop)
const SHADOW_COLOR_IDLE    = "rgba(0,0,0,0.35)";
const SHADOW_COLOR_HOVER   = "rgba(200,160,80,0.5)";
const SHADOW_COLOR_ZONKED  = "rgba(200,30,30,0.35)";
const SHADOW_COLOR_OPENED  = "rgba(255,215,0,0.6)";

// Precomputed color sets per state
const COLORS_NORMAL  = { body:"#8B5E2A", bodyDk:"#7a5020", flap:"#9a6a2a", stroke:"#6b4515", topFlap:"#b07838" };
const COLORS_ZONKED  = { body:"#4e0e0e", bodyDk:"#3e0808", flap:"#621212", stroke:"#9b1c1c", topFlap:"#5e1010" };
const COLORS_OPENED  = { body:"#7a5200", bodyDk:"#6a4600", flap:"#8a5e00", stroke:"#f5d000", topFlap:"#9a6020" };
const COLORS_ITEM    = { body:"#8B5E2A", bodyDk:"#7a5020", flap:"#9a6a2a", stroke:"#f5c842", topFlap:"#b07838" };

function drawEnvelope(
  ctx2d: CanvasRenderingContext2D,
  env: Env,
  hovered: boolean,
  shakeX: number,
  lowEnd: boolean
) {
  const cx = env.x + shakeX;
  const cy = env.y;
  const p  = env.itemOpenProgress;
  const s  = env.scale * (hovered && !env.zonked && !env.opened ? 1.1 : 1);
  const w  = W * s, h = H * s, hw = w/2, hh = h/2;
  const isItemOpen = p > 0;

  ctx2d.save();
  ctx2d.translate(cx, cy);

  // ── Shadow: skip heavy shadow on low-end, use lighter version
  if (!lowEnd) {
    if (env.opened) {
      ctx2d.shadowColor = SHADOW_COLOR_OPENED;
      ctx2d.shadowBlur = 24;
    } else if (env.zonked) {
      ctx2d.shadowColor = SHADOW_COLOR_ZONKED;
      ctx2d.shadowBlur = 10;
    } else if (isItemOpen) {
      ctx2d.shadowColor = env.itemRarity ? RARITY_GLOW[env.itemRarity] : "rgba(255,220,80,0.65)";
      ctx2d.shadowBlur = 14 + p * 16;
    } else if (hovered) {
      ctx2d.shadowColor = SHADOW_COLOR_HOVER;
      ctx2d.shadowBlur = 12;
    } else {
      ctx2d.shadowColor = SHADOW_COLOR_IDLE;
      ctx2d.shadowBlur = 6;
    }
    ctx2d.shadowOffsetY = hovered ? -3 : 2;
  }

  const C = env.zonked ? COLORS_ZONKED : env.opened ? COLORS_OPENED : isItemOpen ? COLORS_ITEM : COLORS_NORMAL;

  // Body bottom
  ctx2d.beginPath();
  ctx2d.roundRect(-hw, -hh+h*0.16, w, h*0.84, 3*s);
  ctx2d.fillStyle = C.body;
  ctx2d.fill();

  // Body dark lower part
  ctx2d.beginPath();
  ctx2d.rect(-hw, -hh+h*0.55, w, h*0.45);
  ctx2d.fillStyle = C.bodyDk;
  ctx2d.fill();

  // Reset shadow before decorations (performance: don't re-apply shadow per shape)
  if (!lowEnd) {
    ctx2d.shadowBlur = 0;
    ctx2d.shadowColor = "transparent";
    ctx2d.shadowOffsetY = 0;
  }

  // Side flaps
  for (const side of [-1, 1]) {
    ctx2d.beginPath();
    ctx2d.moveTo(hw*side, -hh+h*0.16);
    ctx2d.lineTo(0, -hh+h*0.62);
    ctx2d.lineTo(hw*side, hh);
    ctx2d.closePath();
    ctx2d.fillStyle = C.flap;
    ctx2d.fill();
    ctx2d.strokeStyle = C.stroke;
    ctx2d.lineWidth = s;
    ctx2d.stroke();
  }

  // Top flap
  ctx2d.beginPath();
  if (env.zonked || env.opened) {
    ctx2d.moveTo(-hw,-hh+h*0.16); ctx2d.lineTo(0,-hh-h*0.08); ctx2d.lineTo(hw,-hh+h*0.16);
  } else if (p > 0) {
    const flapTip = (-hh + h * 0.58) * (1 - p) + (-hh - h * 0.08) * p;
    ctx2d.moveTo(-hw,-hh+h*0.16); ctx2d.lineTo(0, flapTip); ctx2d.lineTo(hw,-hh+h*0.16);
  } else {
    ctx2d.moveTo(-hw,-hh+h*0.16); ctx2d.lineTo(0,-hh+h*0.58); ctx2d.lineTo(hw,-hh+h*0.16);
  }
  ctx2d.closePath();
  ctx2d.fillStyle = C.topFlap;
  ctx2d.strokeStyle = C.stroke;
  ctx2d.lineWidth = s*1.2;
  ctx2d.fill();
  ctx2d.stroke();

  // Seal (only when closed & no item animation)
  if (!env.zonked && !env.opened && p === 0) {
    const sr = 9*s, sy = -hh+h*0.62;
    ctx2d.beginPath();
    ctx2d.arc(0, sy, sr, 0, Math.PI*2);
    ctx2d.fillStyle = "#c0392b";
    ctx2d.fill();
    if (!lowEnd) { ctx2d.strokeStyle = "#8b1515"; ctx2d.lineWidth = s; ctx2d.stroke(); }
    ctx2d.fillStyle = "#fff";
    ctx2d.font = `bold ${10*s}px serif`;
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillText("✦", 0, sy + s*0.5);
  }

  // Zonk label
  if (env.zonked) {
    ctx2d.fillStyle = "#ef4444";
    ctx2d.font = `900 ${16*s}px Georgia,serif`;
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillText("ZONK!", 0, -hh+h*0.5);
    ctx2d.fillStyle = "rgba(239,68,68,0.35)";
    ctx2d.font = `bold ${13*s}px Georgia,serif`;
    ctx2d.fillText("✕", 0, -hh+h*0.72);
  }

  // Item open: emoji flying up
  if (p > 0 && env.itemEmoji && !env.opened) {
    const emojiY     = (-hh - h * 0.1) - p * h * 1.3;
    const emojiScale = 0.5 + p * 0.9;
    const emojiAlpha = p < 0.18 ? p / 0.18 : p > 0.72 ? (1 - p) / 0.28 : 1;
    const fontSize   = 22 * s * emojiScale;

    // Rarity glow ring (skip on low-end)
    if (!lowEnd && p > 0.12 && env.itemRarity) {
      ctx2d.save();
      ctx2d.globalAlpha = emojiAlpha * 0.45;
      ctx2d.shadowColor = RARITY_GLOW[env.itemRarity];
      ctx2d.shadowBlur  = 20 * p;
      ctx2d.beginPath();
      ctx2d.arc(0, emojiY, fontSize * 0.6, 0, Math.PI * 2);
      ctx2d.fillStyle = "rgba(255,255,255,0.06)";
      ctx2d.fill();
      ctx2d.restore();
    }

    ctx2d.save();
    ctx2d.globalAlpha = emojiAlpha;
    ctx2d.font = `${Math.max(8, fontSize)}px serif`;
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillText(env.itemEmoji, 0, emojiY);
    ctx2d.restore();
  }

  // Opened: document inside
  if (env.opened) {
    const dw=w*0.45, dh=h*0.42;
    ctx2d.fillStyle="#fdf3dc"; ctx2d.strokeStyle="#c8a050"; ctx2d.lineWidth=s;
    ctx2d.beginPath(); ctx2d.roundRect(-dw/2,-hh-dh*0.1,dw,dh,2*s); ctx2d.fill(); ctx2d.stroke();
    ctx2d.strokeStyle="#c8a050"; ctx2d.lineWidth=s*0.9;
    const lx=-dw/2+dw*0.12, rx=dw/2-dw*0.1, by=-hh+dh*0.2;
    [0,1,2].forEach(i=>{ ctx2d.beginPath(); ctx2d.moveTo(lx,by+i*dh*0.22); ctx2d.lineTo(i===2?rx*0.6:rx,by+i*dh*0.22); ctx2d.stroke(); });
    ctx2d.fillStyle="#3d1a00"; ctx2d.font=`800 ${7*s}px Georgia,serif`; ctx2d.textAlign="center"; ctx2d.textBaseline="middle";
    ctx2d.fillText("ASLI", 0, -hh+dh*0.78);
  }

  // Outline detail (skip on low-end for perf)
  if (!lowEnd) {
    ctx2d.strokeStyle = env.zonked ? "rgba(155,28,28,0.3)" : env.opened ? "rgba(245,200,0,0.4)" : "rgba(160,112,48,0.35)";
    ctx2d.lineWidth = s*0.8;
    ctx2d.strokeRect(hw-w*0.32, -hh+h*0.18, w*0.26, h*0.22);
  }

  ctx2d.restore();
}

// ─── Leaderboard Data ─────────────────────────────────────────────────────────
const INVESTORS = [
  { name: "hamba wni",         amount: "Rp25.000", rank: 1  },
  { name: "Mojoworkign",       amount: "Rp25.000", rank: 2  },
  { name: "eleng",             amount: "Rp25.000", rank: 3  },
  { name: "nje",               amount: "Rp10.000", rank: 4  },
  { name: "Rafly",             amount: "Rp10.000", rank: 5  },
  { name: "salveens",          amount: "Rp10.000", rank: 6  },
  { name: "A",                 amount: "Rp10.000", rank: 7  },
  { name: "fikriks",           amount: "Rp10.000", rank: 8  },
  { name: "L",                 amount: "Rp10.000", rank: 9  },
  { name: "org ganteng",       amount: "Rp10.000", rank: 10 },
  { name: "Wni",               amount: "Rp10.000", rank: 11 },
  { name: "asa",               amount: "Rp10.000", rank: 12 },
  { name: "hamba allah",       amount: "Rp10.000", rank: 13 },
  { name: "Rafaanana",         amount: "Rp10.000", rank: 14 },
  { name: "cal",               amount: "Rp10.000", rank: 15 },
  { name: "lia",               amount: "Rp10.000", rank: 16 },
  { name: "Nyai Blorong",      amount: "Rp10.000", rank: 17 },
  { name: "Meidia",            amount: "Rp10.000", rank: 18 },
  { name: "fufufafa win",      amount: "Rp15.000", rank: 19 },
  { name: "insyaAllah berkah", amount: "Rp5.000",  rank: 20 },
  { name: "Kins",              amount: "Rp5.000",  rank: 21 },
  { name: "rifkayy",          amount: "Rp5.000",  rank: 22 },
  { name: "SFZ",               amount: "Rp5.000",  rank: 23 },
  { name: "lunellaby",         amount: "Rp5.000",  rank: 24 },
  { name: "IstriKyu",          amount: "Rp5.000",  rank: 25 },
  { name: "tan",               amount: "Rp5.000",  rank: 26 },
  { name: "ian",               amount: "Rp5.000",  rank: 27 },
  { name: "wonocinno",         amount: "Rp5.000",  rank: 28 },
  { name: "chikuy",            amount: "Rp5.000",  rank: 29 },
  { name: "Pibicupy",          amount: "Rp5.000",  rank: 30 },
  { name: "orang cantik",      amount: "Rp5.000",  rank: 31 },
  { name: "pcr yeonjun",       amount: "Rp5.000",  rank: 32 },
  { name: "tadi",              amount: "Rp5.000",  rank: 33 },
  { name: "imut",              amount: "Rp5.000",  rank: 34 },
  { name: "Nunu",              amount: "Rp5.000",  rank: 35 },
  { name: "🥰",                amount: "Rp5.000",  rank: 36 },
  { name: "Istri XiaYizhou",   amount: "Rp5.000",  rank: 37 },
  { name: "ale",               amount: "Rp5.000",  rank: 38 },
  { name: "Risvan",            amount: "Rp5.000",  rank: 39 },
  { name: "Pakris",            amount: "Rp2.000",  rank: 40 },
  { name: "ote prndidikan",    amount: "Rp2.000",  rank: 41 },
  { name: "solo",              amount: "Rp1.000",  rank: 42 },
  { name: "Dri",               amount: "Rp1.000",  rank: 43 },
  { name: "bahlul",            amount: "Rp1.000",  rank: 44 },
  { name: "wita",              amount: "Rp1.000",  rank: 45 },
  { name: "joko",              amount: "Rp1.000",  rank: 46 },
  { name: "Tadi",              amount: "Rp1.000",  rank: 47 },
];

// ─── Confetti ─────────────────────────────────────────────────────────────────
const MAX_PARTICLES = 120; // hard cap to prevent mobile slowdown

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number;
  rot: number; rotV: number; shape: 0 | 1; // 0=rect, 1=circle
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const envsRef      = useRef<Env[]>([]);
  const hoveredRef   = useRef<number>(-1);
  const rafRef       = useRef<number>(0);
  const lastTRef     = useRef<number>(0);
  const audioRef     = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<"idle"|"playing"|"win">("idle");
  const idCounterRef = useRef<number>(0);
  const sizeRef      = useRef({ w: 1920, h: 1080 });
  const timerRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeElapsedRef = useRef<number>(0);
  const bgmRef       = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef= useRef<HTMLAudioElement | null>(null);
  const itemAudioRef = useRef<HTMLAudioElement | null>(null);
  const lowEndRef    = useRef<boolean>(false);
  // FPS throttle: target ~60fps desktop, ~30fps mobile
  const fpsIntervalRef = useRef<number>(1000 / 60);
  // Mousemove debounce
  const lastMoveRef  = useRef<number>(0);

  const [gameState,   setGameState]   = useState<"idle"|"playing"|"win">("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showFlash,   setShowFlash]   = useState(false);
  const [zonkedCount, setZonkedCount] = useState(0);
  const [openedCount, setOpenedCount] = useState(0);
  const [inventory,   setInventory]   = useState<Record<string,number>>({});
  const [showInv,     setShowInv]     = useState(false);
  const [hasOpenedInv, setHasOpenedInv] = useState(false);
  const [sessionItemCount, setSessionItemCount] = useState(0);
  const [foundItem,   setFoundItem]   = useState<ItemDef|null>(null);
  const [lastItemIsNew, setLastItemIsNew] = useState(false);
  const [cumulativeStats, setCumulativeStats] = useState<GameStats>({ totalTime: 0, totalOpened: 0 });

  useEffect(() => {
    setInventory(loadInventory());
    setCumulativeStats(loadStats());

    // Detect device capability after mount
    lowEndRef.current = isLowEndDevice();
    fpsIntervalRef.current = lowEndRef.current ? 1000 / 30 : 1000 / 60;

    if (typeof window !== "undefined") {
      bgmRef.current = new Audio("/music.mp3");
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.3;
      clickAudioRef.current = new Audio("/click.mp3");
      itemAudioRef.current  = new Audio("/item.mp3");
    }
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = makeAudioCtx();
    if (audioRef.current?.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }, []);

  const spawnConfetti = useCallback((x: number, y: number, rarity: Rarity, count = 18) => {
    const palettes: Record<Rarity, string[]> = {
      umum:   ["#94a3b8","#cbd5e1","#fff"],
      langka: ["#3b82f6","#60a5fa","#fff","#1d4ed8"],
      epic:   ["#a855f7","#c084fc","#fff","#7c3aed"],
      legend: ["#f59e0b","#fbbf24","#fff","#d97706","#ef4444"],
    };
    const colors = palettes[rarity];
    // Respect particle cap — trim oldest if needed
    const budget = Math.min(count, MAX_PARTICLES - particlesRef.current.length + count);
    if (budget <= 0) return;
    if (particlesRef.current.length + budget > MAX_PARTICLES) {
      particlesRef.current.splice(0, particlesRef.current.length + budget - MAX_PARTICLES);
    }
    // Reduce particle count on low-end
    const actualCount = lowEndRef.current ? Math.ceil(budget * 0.5) : budget;
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 5,
        life: 1,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.28,
        shape: Math.random() > 0.4 ? 0 : 1,
      });
    }
  }, []);

  const spawnEnv = useCallback((cw: number, ch: number, row: number, offsetX = 0): Env => {
    const FOOTER_H = 80, playH = ch - FOOTER_H;
    const rowH = (playH * 0.82) / ROWS, topPad = playH * 0.13;
    const baseY = topPad + row * rowH + rowH / 2 + (Math.random() - 0.5) * 10;
    const hasItem = Math.random() < ITEM_SPAWN_CHANCE;
    return {
      id: idCounterRef.current++,
      x: cw + W + offsetX + Math.random() * 60,
      y: baseY,
      vx: (0.045 + Math.random() * 0.045) * cw * 0.001,
      wobble: Math.random() * Math.PI * 2,
      wobbleAmp: 2.5 + Math.random() * 3,
      wobbleSpeed: 0.0008 + Math.random() * 0.0006,
      scale: 0.78 + Math.random() * 0.28,
      isReal: false,
      itemId: hasItem ? pickRandomItem().id : null,
      zonked: false, opened: false,
      shakeTimer: 0, shakePhase: 0,
      fadeTimer: 0, opacity: 1, row,
      isItemShake: false, itemOpenProgress: 0,
      itemEmoji: "", itemRarity: null,
    };
  }, []);

  const generateEnvelopes = useCallback((cw: number, ch: number): Env[] => {
    idCounterRef.current = 0;
    const FOOTER_H = 80, playH = ch - FOOTER_H;
    const rowH = (playH * 0.82) / ROWS, topPad = playH * 0.13;
    const envs: Env[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const row = i % ROWS, col = Math.floor(i / ROWS);
      const totalCols = Math.ceil(TOTAL / ROWS);
      const baseY = topPad + row * rowH + rowH / 2 + (Math.random() - 0.5) * 10;
      const hasItem = Math.random() < ITEM_SPAWN_CHANCE;
      envs.push({
        id: idCounterRef.current++,
        x: cw * 1.05 + col * (cw * 1.2 / totalCols) + (Math.random() - 0.5) * 12,
        y: baseY,
        vx: (0.045 + Math.random() * 0.045) * cw * 0.001,
        wobble: Math.random() * Math.PI * 2,
        wobbleAmp: 2.5 + Math.random() * 3,
        wobbleSpeed: 0.0008 + Math.random() * 0.0006,
        scale: 0.78 + Math.random() * 0.28,
        isReal: false,
        itemId: hasItem ? pickRandomItem().id : null,
        zonked: false, opened: false,
        shakeTimer: 0, shakePhase: 0,
        fadeTimer: 0, opacity: 1, row,
        isItemShake: false, itemOpenProgress: 0,
        itemEmoji: "", itemRarity: null,
      });
    }
    return envs;
  }, []);

  // ── Render loop (FPS-throttled) ──
  const render = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(render);

    // FPS throttle
    const elapsed = ts - lastTRef.current;
    if (elapsed < fpsIntervalRef.current) return;
    // Snap last time to grid to avoid drift
    lastTRef.current = ts - (elapsed % fpsIntervalRef.current);
    const delta = Math.min(elapsed, 60); // cap delta at 60ms

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const lowEnd = lowEndRef.current;

    // Clear with background color (alpha:false is faster)
    ctx.fillStyle = "#120600";
    ctx.fillRect(0, 0, cw, ch);

    const envs = envsRef.current;
    const isPlaying = gameStateRef.current === "playing";
    const unlocked = timeElapsedRef.current >= 300;
    const toRemove: number[] = [];

    for (let i = 0; i < envs.length; i++) {
      const e = envs[i];

      if (isPlaying) {
        if (!e.zonked && !e.opened && e.fadeTimer === 0) {
          e.x -= e.vx * delta;
          if (e.x < -W) e.x = cw + W / 2 + Math.random() * 80;
          e.wobble += e.wobbleSpeed * delta;
        }
        if (e.shakeTimer > 0) {
          e.shakeTimer -= delta;
          e.shakePhase += 0.6;
          if (e.isItemShake) {
            e.itemOpenProgress = Math.min(1, 1 - e.shakeTimer / 620);
          }
          if (e.shakeTimer <= 0) {
            e.shakeTimer = 0;
            if (e.isItemShake) {
              e.isItemShake = false;
              e.itemOpenProgress = 1;
              e.fadeTimer = 900;
            } else {
              e.zonked = true;
              e.fadeTimer = 1400;
            }
          }
        }
        if (e.fadeTimer > 0 && !e.isItemShake) {
          const maxFade = e.zonked ? 1400 : 900;
          e.fadeTimer -= delta;
          e.opacity = Math.max(0, e.fadeTimer / maxFade);
          if (e.fadeTimer <= 0) toRemove.push(i);
        }
      }

      // Unlock glow effect (simplified on low-end)
      if (unlocked && isPlaying && !e.zonked && !e.opened && e.opacity > 0.5 && !lowEnd) {
        const pulse = 0.28 + 0.22 * Math.sin(ts * 0.003 + e.id * 0.7);
        ctx.save();
        ctx.globalAlpha = e.opacity * pulse;
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur  = 22;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, W * e.scale * 0.52, H * e.scale * 0.42, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.07)";
        ctx.fill();
        ctx.restore();
      }

      const wobbleY = Math.sin(e.wobble) * (e.zonked ? 0.8 : e.wobbleAmp);
      const shakeX  = e.shakeTimer > 0 ? Math.sin(e.shakePhase) * 9 * (e.shakeTimer / 600) : 0;

      ctx.globalAlpha = e.opacity;
      drawEnvelope(ctx, { ...e, y: e.y + wobbleY }, hoveredRef.current === e.id, shakeX, lowEnd);
      ctx.globalAlpha = 1;
    }

    // ── Confetti (batch draw same-color particles) ──
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.22;
      p.vx *= 0.98;
      p.rot += p.rotV;
      p.life -= lowEnd ? 0.032 : 0.022; // fade faster on low-end = fewer active particles
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 0) {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    if (toRemove.length > 0 && isPlaying) {
      const uniqueRemove = [...new Set(toRemove)].sort((a, b) => b - a);
      for (const idx of uniqueRemove) {
        const dead = envs[idx];
        envs.splice(idx, 1);
        envs.push(spawnEnv(cw, ch, dead.row, Math.random() * 200));
      }
    }
  }, [spawnEnv]);

  const hitTest = useCallback((mx: number, my: number): Env | null => {
    const envs = envsRef.current;
    for (let i = envs.length - 1; i >= 0; i--) {
      const e = envs[i];
      if (e.zonked || e.opened || e.opacity < 0.5) continue;
      const w = W * e.scale, h = H * e.scale;
      if (mx >= e.x - w / 2 && mx <= e.x + w / 2 && my >= e.y - h / 2 && my <= e.y + h / 2) return e;
    }
    return null;
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const cw = canvas.width, ch = canvas.height;
    sizeRef.current = { w: cw, h: ch };
    envsRef.current = generateEnvelopes(cw, ch);
    setTimeElapsed(0); timeElapsedRef.current = 0;
    setZonkedCount(0); setOpenedCount(0);
    setShowFlash(false); setHasOpenedInv(false); setSessionItemCount(0);
    particlesRef.current = [];
    gameStateRef.current = "playing"; setGameState("playing");
    if (bgmRef.current) bgmRef.current.play().catch(() => {});
  }, [generateEnvelopes]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      // Use logical pixels (no DPR scaling on mobile = big perf win)
      const dpr = lowEndRef.current ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const lw = window.innerWidth, lh = window.innerHeight;
      c.width  = lw * dpr;
      c.height = lh * dpr;
      c.style.width  = lw + "px";
      c.style.height = lh + "px";
      const ctx = c.getContext("2d", { alpha: false });
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w: lw, h: lh };
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeElapsed(t => {
          const next = t + 1;
          timeElapsedRef.current = next;
          setCumulativeStats(prev => {
            const updated = { ...prev, totalTime: prev.totalTime + 1 };
            saveStats(updated);
            return updated;
          });
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // Throttled mousemove (~60fps max, lower on mobile)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    if (now - lastMoveRef.current < 16) return; // ~60fps cap
    lastMoveRef.current = now;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitTest(mx, my), newHov = hit ? hit.id : -1;
    if (hoveredRef.current !== newHov) {
      hoveredRef.current = newHov;
      (e.target as HTMLCanvasElement).style.cursor = newHov >= 0 ? "pointer" : "default";
    }
  }, [hitTest]);

  // Touch support
  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== "playing") return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = touch.clientX - rect.left, my = touch.clientY - rect.top;
    const hit = hitTest(mx, my); if (!hit) return;
    // Synthesize click
    hit.id; // just trigger a click-like handler below
    handleClickCore(mx, my, hit);
  }, [hitTest]);

  const foundItemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extracted click core logic (shared by mouse + touch)
  const handleClickCore = useCallback((mx: number, my: number, hit: Env) => {
    const audio = getAudio();

    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }

    if ((hit.isReal || Math.random() < 0.01) && timeElapsedRef.current >= 300) {
      hit.opened = true;
      gameStateRef.current = "win"; setGameState("win"); setShowFlash(true);
      setOpenedCount(c => {
        const next = c + 1;
        setCumulativeStats(prev => { const u = { ...prev, totalOpened: prev.totalOpened + 1 }; saveStats(u); return u; });
        return next;
      });
      if (audio) playWin(audio);
      setTimeout(() => setShowFlash(false), 2800);
    } else if (hit.itemId) {
      const capturedItemId = hit.itemId;
      const itemDef = ITEMS.find(i => i.id === capturedItemId)!;
      hit.itemId = null;
      hit.shakeTimer = 620;
      hit.shakePhase = 0;
      hit.isItemShake = true;
      hit.itemOpenProgress = 0;
      hit.itemEmoji = itemDef.emoji;
      hit.itemRarity = itemDef.rarity;

      setOpenedCount(c => {
        const next = c + 1;
        setCumulativeStats(prev => { const u = { ...prev, totalOpened: prev.totalOpened + 1 }; saveStats(u); return u; });
        return next;
      });

      const newInv = loadInventory();
      const isNew = !newInv[itemDef.id];
      newInv[itemDef.id] = (newInv[itemDef.id] || 0) + 1;
      saveInventory(newInv);
      setInventory({ ...newInv });
      setSessionItemCount(c => c + 1);
      setHasOpenedInv(false);

      if (itemAudioRef.current) {
        itemAudioRef.current.currentTime = 0;
        itemAudioRef.current.play().catch(() => {});
      }
      if (audio) playItem(audio, itemDef.rarity);

      spawnConfetti(hit.x, hit.y, itemDef.rarity,
        itemDef.rarity === "legend" ? 40 : itemDef.rarity === "epic" ? 28 : itemDef.rarity === "langka" ? 20 : 14
      );

      if (foundItemTimerRef.current) clearTimeout(foundItemTimerRef.current);
      setFoundItem(null);
      requestAnimationFrame(() => {
        setFoundItem(itemDef);
        setLastItemIsNew(isNew);
        foundItemTimerRef.current = setTimeout(() => setFoundItem(null), 3400);
      });
    } else {
      hit.shakeTimer = 620; hit.shakePhase = 0;
      setOpenedCount(c => {
        const next = c + 1;
        setCumulativeStats(prev => { const u = { ...prev, totalOpened: prev.totalOpened + 1 }; saveStats(u); return u; });
        return next;
      });
      if (audio) { playZonk(audio); playOpen(audio); }
      setTimeout(() => setZonkedCount(c => c + 1), 650);
    }
  }, [getAudio, spawnConfetti]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== "playing") return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitTest(mx, my); if (!hit) return;
    handleClickCore(mx, my, hit);
  }, [hitTest, handleClickCore]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const totalCollected = Object.keys(inventory).length;

  return (
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",position:"relative",fontFamily:"'Georgia',serif",background:"#120600"}}>
      <style>{`
        @keyframes flashPulse { 0%{opacity:0;transform:scale(0.3)} 25%{opacity:1;transform:scale(1)} 75%{opacity:1} 100%{opacity:0;transform:scale(2)} }
        @keyframes floatIn { from{opacity:0;transform:translateY(50px) scale(0.88)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes sparkle { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1.6) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} }
        @keyframes winBounce { 0%{transform:scale(1)} 30%{transform:scale(1.4) rotate(-6deg)} 60%{transform:scale(0.92) rotate(4deg)} 100%{transform:scale(1.1)} }
        @keyframes timerGlow { 0%,100%{text-shadow:0 0 8px #f59e0b,0 0 16px #d97706} 50%{text-shadow:0 0 22px #fbbf24,0 0 44px #f59e0b} }
        @keyframes saweriaGlow { 0%,100%{transform:scale(1);box-shadow:0 4px 18px rgba(249,115,22,0.45)} 50%{transform:scale(1.07);box-shadow:0 6px 28px rgba(249,115,22,0.75)} }
        @keyframes itemPop { 0%{opacity:0;transform:translateX(-50%) translateY(20px) scale(0.8)} 15%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.05)} 85%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(0.95)} }
        @keyframes invSlideIn { from{opacity:0;transform:translateY(30px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes legendPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.6),0 4px 20px rgba(245,158,11,0.3)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0),0 6px 30px rgba(245,158,11,0.6)} }
        @keyframes epicPulse { 0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,0.5)} 50%{box-shadow:0 0 0 5px rgba(168,85,247,0)} }
        @keyframes invBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        @keyframes marqueeScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        .header-container { display: grid !important; grid-template-columns: 1fr auto 1fr; align-items: center; }
        .header-title-wrapper { justify-self: start; }
        .header-timer-wrapper { justify-self: center; }
        .header-actions-wrapper { justify-self: end; display: flex; gap: 10px; width: auto; pointer-events: none; }
        .header-actions-wrapper > * { pointer-events: all; }

        @media (max-width: 600px) {
          .header-container { grid-template-columns: 1fr !important; grid-template-rows: auto auto; padding: 10px 14px !important; gap: 10px !important; justify-items: center; }
          .header-title-wrapper { justify-self: center !important; }
          .header-title-text { display: inline !important; font-size: 15px !important; }
          .header-actions-wrapper { grid-row: 2; grid-column: 1; width: 100% !important; justify-content: space-between !important; }
          .header-timer-wrapper { grid-row: 2; grid-column: 1; justify-self: center !important; z-index: 2; padding-top: 2px; }
          .idle-popup { padding: 24px 20px !important; }
          .idle-title { font-size: 20px !important; }
          .stats-row { flex-wrap: wrap !important; gap: 8px 12px !important; }
          .win-popup { padding: 24px 20px !important; max-height: 85vh !important; }
          .inv-modal { padding: 20px 16px !important; }
          .item-grid { grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)) !important; gap: 8px !important; }
          .saweria-btn { padding: 8px 16px !important; font-size: 13px !important; }
          .item-popup { transform: translateX(-50%) scale(0.85) !important; bottom: 70px !important; }
          .footer-saweria { height: 60px !important; }
        }
        @media (max-width: 380px) {
          .item-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important; }
          .saweria-btn { font-size: 11px !important; padding: 6px 12px !important; }
        }
        /* Prevent iOS scroll bounce interfering with canvas touches */
        canvas { touch-action: none; }
      `}</style>

      {/* ── Background video overlay (skip on low-end) ── */}
      {(gameState === "playing" || gameState === "win") && !lowEndRef.current && (
        <video
          autoPlay loop muted playsInline
          style={{position:"fixed",inset:0,width:"100%",height:"100%",objectFit:"cover",
            opacity:0.10,mixBlendMode:"screen",pointerEvents:"none",zIndex:1}}>
          <source src="/video.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        style={{display:"block",position:"fixed",inset:0,zIndex:2}}
        onMouseMove={gameState === "playing" ? handleMouseMove : undefined}
        onClick={gameState === "playing" ? handleClick : undefined}
        onTouchEnd={gameState === "playing" ? handleTouch : undefined}
      />

      {/* Win Flash */}
      {showFlash && (
        <div style={{position:"fixed",inset:0,zIndex:90,pointerEvents:"none",
          background:"radial-gradient(circle at center,#fffff0 0%,#ffd700 20%,rgba(255,180,0,0.3) 50%,transparent 75%)",
          animation:"flashPulse 2.8s ease-out forwards"}}/>
      )}

      {/* ── Item Found Popup ── */}
      {foundItem && (
        <div className="item-popup" style={{
          position:"fixed",bottom:90,left:"50%",zIndex:80,pointerEvents:"none",
          animation:"itemPop 3.2s ease-out forwards",
          background:"linear-gradient(135deg, #1a0a00, #2d1500)",
          border:`2px solid ${RARITY_COLOR[foundItem.rarity]}`,
          borderRadius:12,padding:"14px 24px",
          boxShadow:`0 0 24px ${RARITY_GLOW[foundItem.rarity]}, 0 8px 32px rgba(0,0,0,0.7)`,
          minWidth:240,textAlign:"center",
        }}>
          <div style={{fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:RARITY_COLOR[foundItem.rarity],marginBottom:4}}>
            {lastItemIsNew ? "✨ ITEM BARU! ✨" : "Item Ditemukan"}
          </div>
          <div style={{fontSize:44,marginBottom:4}}>{foundItem.emoji}</div>
          <div style={{color:"#fdf3dc",fontWeight:800,fontSize:16,marginBottom:2}}>{foundItem.name}</div>
          <div style={{display:"inline-block",padding:"2px 10px",borderRadius:99,
            background:RARITY_COLOR[foundItem.rarity],color:"#fff",
            fontSize:11,fontWeight:700,letterSpacing:"1px"}}>{RARITY_LABEL[foundItem.rarity]}</div>
          <div style={{color:"rgba(245,217,160,0.6)",fontSize:12,marginTop:6,fontStyle:"italic"}}>{foundItem.description}</div>
        </div>
      )}

      {/* ── Header ── */}
      {(gameState === "playing" || gameState === "win") && (
        <div className="header-container" style={{position:"fixed",top:0,left:0,right:0,zIndex:20,
          background:"linear-gradient(to bottom,rgba(8,2,0,0.95),transparent)",
          padding:"8px 20px",pointerEvents:"none"}}>

          <div className="header-title-wrapper" style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>📂</span>
            <span className="header-title-text" style={{color:"#c8a050",fontWeight:700,fontSize:13,letterSpacing:"0.5px"}}>Temukan Ijazah Asli Jokowi</span>
          </div>

          <div className="header-timer-wrapper" style={{textAlign:"center"}}>
            <div style={{color:"#c8a050",fontSize:9,letterSpacing:"2px",textTransform:"uppercase"}}>Waktu</div>
            <div style={{color:"#fbbf24",fontSize:22,fontWeight:700,fontVariantNumeric:"tabular-nums",
              animation:"timerGlow 2s ease-in-out infinite"}}>{formatTime(timeElapsed)}</div>
          </div>

          <div className="header-actions-wrapper">
            <div style={{background:"rgba(74,40,0,0.85)",border:"1px solid rgba(200,160,80,0.5)",borderRadius:6,
              padding:"5px 10px",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16,lineHeight:1}}>✉️</span>
              <span style={{color:"rgba(245,217,160,0.85)",fontSize:13,fontWeight:700}}>{openedCount}</span>
            </div>
            <button onClick={() => { setShowInv(v => !v); setHasOpenedInv(true); }} style={{
              position:"relative",background:"rgba(74,40,0,0.85)",
              border:"1px solid rgba(200,160,80,0.5)",borderRadius:6,padding:"5px 8px",
              color:"#f5d9a0",cursor:"pointer",fontSize:18,lineHeight:1,
              display:"flex",alignItems:"center",justifyContent:"center",transition:"filter 0.15s"}}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.3)"}
              onMouseLeave={e => e.currentTarget.style.filter = ""}>
              🎒
              {sessionItemCount > 0 && !hasOpenedInv && (
                <span style={{position:"absolute",top:-6,right:-6,background:"#f59e0b",color:"#1a0800",
                  borderRadius:99,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:9,fontWeight:900,animation:"invBadge 2s ease-in-out infinite"}}>{sessionItemCount}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Saweria footer + Leaderboard marquee ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:30}}>
        <div style={{background:"linear-gradient(90deg,#0e0500,#1e0c00,#0e0500)",
          borderTop:"1px solid rgba(200,160,80,0.2)",height:28,overflow:"hidden",
          display:"flex",alignItems:"center",position:"relative"}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:60,background:"linear-gradient(to right,#0e0500,transparent)",zIndex:2,pointerEvents:"none"}}/>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:60,background:"linear-gradient(to left,#0e0500,transparent)",zIndex:2,pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:0,
            animation:"marqueeScroll 60s linear infinite",whiteSpace:"nowrap",willChange:"transform"}}>
            {[...INVESTORS, ...INVESTORS].map((inv, i) => (
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:6,paddingRight:40}}>
                <span style={{fontSize:11,fontWeight:900,
                  color:inv.rank===1?"#ffd700":inv.rank===2?"#c0c0c0":inv.rank===3?"#cd7f32":"rgba(200,160,80,0.5)"}}>
                  {inv.rank===1?"🥇":inv.rank===2?"🥈":inv.rank===3?"🥉":`#${inv.rank}`}
                </span>
                <span style={{color:inv.rank===1?"#ffd700":inv.rank===2?"#d0d0d0":inv.rank===3?"#e8a060":"rgba(245,217,160,0.65)",
                  fontSize:12,fontWeight:inv.rank<=3?700:500}}>{inv.name}</span>
                <span style={{color:inv.rank===1?"#fbbf24":inv.rank===2?"#a0a0a0":inv.rank===3?"#c07040":"rgba(180,130,60,0.6)",
                  fontSize:11}}>{inv.amount}</span>
                <span style={{color:"rgba(200,160,80,0.2)",fontSize:10,paddingLeft:4}}>·</span>
              </span>
            ))}
          </div>
        </div>

        <div className="footer-saweria" style={{height:70,
          background:"linear-gradient(90deg,#1a0800,#2d1000,#1a0800)",
          borderTop:"1px solid rgba(200,160,80,0.12)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
          <a href="https://saweria.co/aryatim" target="_blank" rel="noopener noreferrer" className="saweria-btn"
            style={{display:"inline-flex",alignItems:"center",gap:8,
              background:"linear-gradient(135deg,#f97316,#c2410c)",color:"#fff",textDecoration:"none",
              padding:"10px 32px",borderRadius:"6px",fontSize:16,fontWeight:800,letterSpacing:"0.8px",
              animation:"saweriaGlow 1.6s ease-in-out infinite"}}
            onMouseEnter={e=>{e.currentTarget.style.animationPlayState="paused";e.currentTarget.style.filter="brightness(1.18)";e.currentTarget.style.transform="scale(1.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.animationPlayState="running";e.currentTarget.style.filter="";e.currentTarget.style.transform="";}}
          >☕ Jangan Lupa Support di Saweria YA!</a>
          <div style={{color:"rgba(245,217,160,0.9)",fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>100% DANA AKAN DI DONASIKAN KE PANTI ASUHAN</div>
        </div>
      </div>

      {/* ── Inventory Modal ── */}
      {showInv && (
        <div style={{position:"fixed",inset:0,zIndex:70,background:"rgba(4,1,0,0.88)",backdropFilter:"blur(8px)",
          display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={e => { if (e.target === e.currentTarget) setShowInv(false); }}>
          <div className="inv-modal" style={{background:"linear-gradient(160deg,#1a0a00,#2d1400)",
            border:"2px solid #c8a050",borderRadius:12,padding:"28px 32px",maxWidth:640,width:"92%",
            maxHeight:"80vh",overflow:"auto",animation:"invSlideIn 0.3s ease-out",
            boxShadow:"0 30px 80px rgba(0,0,0,0.9)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{color:"#f5d9a0",fontWeight:800,fontSize:22,margin:0}}>🎒 Inventori</h2>
                <div style={{color:"#c8a050",fontSize:12,marginTop:2}}>{totalCollected}/{ITEMS.length} item ditemukan</div>
              </div>
              <button onClick={() => setShowInv(false)} style={{background:"rgba(255,255,255,0.08)",
                border:"1px solid rgba(200,160,80,0.3)",color:"#f5d9a0",borderRadius:6,
                padding:"6px 14px",cursor:"pointer",fontSize:14}}>✕ Tutup</button>
            </div>

            {(["legend","epic","langka","umum"] as Rarity[]).map(rarity => (
              <div key={rarity} style={{marginBottom:20}}>
                <div style={{color:RARITY_COLOR[rarity],fontSize:11,fontWeight:700,letterSpacing:"2px",
                  textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{height:1,flex:1,background:RARITY_COLOR[rarity],opacity:0.3}}/>
                  {RARITY_LABEL[rarity]}
                  <div style={{height:1,flex:1,background:RARITY_COLOR[rarity],opacity:0.3}}/>
                </div>
                <div className="item-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
                  {ITEMS.filter(i => i.rarity === rarity).map(item => {
                    const count = inventory[item.id] || 0;
                    const owned = count > 0;
                    return (
                      <div key={item.id} style={{
                        background: owned ? "linear-gradient(135deg,rgba(30,15,0,0.9),rgba(50,25,0,0.9))" : "rgba(10,5,0,0.6)",
                        border: owned ? `1.5px solid ${RARITY_COLOR[rarity]}` : "1.5px solid rgba(100,60,20,0.3)",
                        borderRadius:10,padding:"14px 10px",textAlign:"center",position:"relative",
                        animation: owned&&rarity==="legend" ? "legendPulse 2s ease-in-out infinite"
                                 : owned&&rarity==="epic"   ? "epicPulse 2.5s ease-in-out infinite" : "none",
                        transition:"transform 0.15s"}}
                        onMouseEnter={e => { if (owned) (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; }}>
                        <div style={{fontSize:36,marginBottom:6,filter:owned?"none":"brightness(0)",opacity:owned?1:0.35}}>{item.emoji}</div>
                        <div style={{color:owned?"#fdf3dc":"rgba(150,100,50,0.4)",fontWeight:700,fontSize:12,marginBottom:4,lineHeight:1.3}}>{owned?item.name:"???"}</div>
                        <div style={{display:"inline-block",padding:"2px 8px",borderRadius:99,
                          background:owned?RARITY_COLOR[rarity]:"rgba(80,40,0,0.4)",
                          color:owned?"#fff":"rgba(150,100,50,0.5)",
                          fontSize:9,fontWeight:700,letterSpacing:"1px",marginBottom:owned&&count>1?4:0}}>
                          {RARITY_LABEL[rarity]}
                        </div>
                        {owned && count > 1 && (
                          <div style={{position:"absolute",top:6,right:8,background:RARITY_COLOR[rarity],color:"#fff",
                            borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:800}}>×{count}</div>
                        )}
                        {owned && (
                          <div style={{color:"rgba(200,160,80,0.6)",fontSize:10,marginTop:4,fontStyle:"italic",lineHeight:1.4}}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── IDLE popup ── */}
      {gameState === "idle" && (
        <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:50,background:"rgba(8,2,0,0.92)",backdropFilter:"blur(10px)"}}>
          <div className="idle-popup" style={{background:"linear-gradient(160deg,#fdf3dc,#f5d9a0 60%,#e8c070)",borderRadius:"4px",
            padding:"44px 52px",maxWidth:480,width:"90%",textAlign:"center",animation:"floatIn 0.5s ease-out",
            boxShadow:"0 40px 100px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.5)",
            border:"2px solid #c8a050",position:"relative"}}>
            {[["top:10px","left:10px"],["top:10px","right:10px"],["bottom:10px","left:10px"],["bottom:10px","right:10px"]].map((pos,i) => (
              <div key={i} style={{position:"absolute",...Object.fromEntries(pos.map(p => p.split(":"))),width:20,height:20,border:"2px solid #c8a050",borderRadius:"2px"}}/>
            ))}
            <div style={{fontSize:52,marginBottom:8}}>📂</div>
            <h1 className="idle-title" style={{fontSize:26,fontWeight:800,color:"#3d1a00",letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:10}}>
              Temukan Ijazah Asli Jokowi
            </h1>
            <div style={{width:50,height:3,background:"#c8a050",margin:"0 auto 16px",borderRadius:2}}/>
            <p style={{color:"#5a3010",fontSize:13.5,lineHeight:1.9,marginBottom:12}}>
              Bantu Roy Suryo menemukan <strong>ijazah asli Jokowi</strong>💥
            </p>
            <div style={{background:"rgba(60,20,0,0.08)",borderRadius:8,padding:"10px 16px",marginBottom:20,fontSize:12,color:"#5a3010",textAlign:"left"}}>
              🎒 <strong>Item Tersembunyi</strong> juga bersembunyi di amplop!<br/>
              <span style={{color:RARITY_COLOR.umum}}>■ Umum</span>{" · "}
              <span style={{color:RARITY_COLOR.langka}}>■ Langka</span>{" · "}
              <span style={{color:RARITY_COLOR.epic}}>■ Epic</span>{" · "}
              <span style={{color:RARITY_COLOR.legend}}>■ Legendaris</span>
            </div>
            {(totalCollected > 0 || cumulativeStats.totalOpened > 0) && (
              <div className="stats-row" style={{background:"rgba(60,20,0,0.08)",borderRadius:8,padding:"10px 16px",marginBottom:16,
                display:"flex",gap:16,justifyContent:"center",fontSize:12,color:"#7a4010"}}>
                {cumulativeStats.totalOpened > 0 && (<span>✉️ <strong>{cumulativeStats.totalOpened.toLocaleString()}</strong> amplop dibuka</span>)}
                {cumulativeStats.totalTime > 0 && (<span>⏱ <strong>{formatTime(cumulativeStats.totalTime)}</strong> total bermain</span>)}
                {totalCollected > 0 && (<span>🎒 <strong>{totalCollected}/{ITEMS.length}</strong> item</span>)}
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={startGame} style={{
                background:"linear-gradient(135deg,#d4830a,#b8690a)",color:"#fff9f0",border:"none",
                padding:"15px 44px",fontSize:17,fontWeight:700,borderRadius:"3px",cursor:"pointer",
                letterSpacing:"2.5px",textTransform:"uppercase",
                boxShadow:"0 8px 24px rgba(180,100,10,0.55),inset 0 1px 0 rgba(255,255,255,0.2)",
                transition:"transform 0.15s"}}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>▶ Mulai</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIN popup ── */}
      {gameState === "win" && !showFlash && (
        <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:60,background:"radial-gradient(ellipse at center,rgba(255,220,50,0.1),rgba(8,2,0,0.94) 65%)",
          backdropFilter:"blur(6px)"}}>
          <div className="win-popup" style={{background:"linear-gradient(160deg,#fdf3dc,#f5d9a0 60%,#e8c070)",
            borderRadius:"4px",padding:"40px 48px",maxWidth:500,width:"92%",
            textAlign:"center",animation:"floatIn 0.4s ease-out",
            boxShadow:"0 0 80px rgba(255,200,0,0.3),0 40px 100px rgba(0,0,0,0.85)",
            border:"2px solid #f0b030",position:"relative",maxHeight:"90vh",overflow:"auto"}}>
            {[...Array(12)].map((_,i) => (
              <div key={i} style={{position:"absolute",fontSize:18,
                top:`${8+Math.random()*84}%`,left:`${4+Math.random()*92}%`,
                animation:`sparkle 1.8s ${i*0.15}s ease-in-out infinite`,pointerEvents:"none"}}>✨</div>
            ))}
            <div style={{fontSize:68,animation:"winBounce 0.7s ease-out"}}>🏆</div>
            <h2 style={{fontSize:30,fontWeight:800,color:"#3d1a00",marginBottom:6,letterSpacing:"-1px"}}>Selamat! 🎉</h2>
            <p style={{color:"#5a3010",fontSize:14,marginBottom:8,lineHeight:1.7}}>
              Kamu berhasil menemukan <strong>Ijazah Asli Jokowi</strong>!
            </p>
            <div style={{background:"rgba(60,20,0,0.1)",borderRadius:"3px",padding:"10px 22px",marginBottom:8,display:"inline-block"}}>
              <div style={{color:"#7a4010",fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Waktu Bermain</div>
              <div style={{fontSize:38,fontWeight:700,color:"#c8870a",fontVariantNumeric:"tabular-nums"}}>{formatTime(timeElapsed)}</div>
            </div>
            <p style={{color:"#7a4010",fontSize:12,marginBottom:8}}>
              ZONK: <strong style={{color:"#c0392b"}}>{zonkedCount}</strong> · Dibuka: <strong>{openedCount}</strong>
              · Item: <strong>{totalCollected}/{ITEMS.length}</strong>
            </p>
            <button onClick={() => setShowInv(true)} style={{
              background:"linear-gradient(135deg,#3a1f00,#2d1500)",color:"#f5d9a0",
              border:"1.5px solid #c8a050",padding:"8px 18px",fontSize:13,
              fontWeight:700,borderRadius:"3px",cursor:"pointer",marginBottom:16}}>
              🎒 Lihat Inventori ({totalCollected}/{ITEMS.length})
            </button>
            <div style={{marginBottom:14}}>
              <div style={{color:"#7a4010",fontSize:10,letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Ajak Teman Bermain 👇</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                {[
                  {label:"WhatsApp",emoji:"💬",bg:"#25D366",url:()=>`https://wa.me/?text=${encodeURIComponent(`🎯 Ayo Bermain Cari IJazah Asli Jokowi!\nAku selesai dalam ${formatTime(timeElapsed)} dengan ${zonkedCount} ZONK!\n👉 ${window.location.href}`)}`},
                  {label:"Telegram",emoji:"✈️",bg:"#229ED9",url:()=>`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`🎯 Ayo Bermain Cari Ijazah Asli Jokowi! Aku selesai dalam ${formatTime(timeElapsed)}!`)}`},
                  {label:"X",emoji:"🐦",bg:"#000",url:()=>`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎯 Ayo Bermain Cari ijazah Asli Jokowi! ${formatTime(timeElapsed)} · ${zonkedCount} ZONK 👉 ${window.location.href}`)}`},
                  {label:"Facebook",emoji:"📘",bg:"#1877F2",url:()=>`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`},
                ].map(s => (
                  <a key={s.label} href={s.url()} target="_blank" rel="noopener noreferrer"
                    style={{display:"inline-flex",alignItems:"center",gap:4,background:s.bg,color:"#fff",
                      padding:"7px 12px",borderRadius:"3px",fontSize:12,fontWeight:700,textDecoration:"none",
                      boxShadow:"0 3px 10px rgba(0,0,0,0.25)",transition:"transform 0.15s,filter 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.filter="brightness(1.15)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.filter="";}}>
                    <span>{s.emoji}</span>{s.label}
                  </a>
                ))}
              </div>
            </div>
            <button onClick={startGame} style={{
              background:"linear-gradient(135deg,#d4830a,#b8690a)",color:"#fff9f0",border:"none",
              padding:"12px 36px",fontSize:14,fontWeight:700,borderRadius:"3px",cursor:"pointer",
              letterSpacing:"2px",textTransform:"uppercase",boxShadow:"0 6px 20px rgba(180,100,10,0.5)"}}>
              🔄 Main Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}