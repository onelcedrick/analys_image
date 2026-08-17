/* ------------------------------------------------------------------ */
/*  HistoVision Pro — traitements avancés (partie 1/2)                */
/*  F2 Transport optimal · F3 masque peau                             */
/* ------------------------------------------------------------------ */

import { boxBlur, clamp01, smoothstep } from "./imaging";
import { labToImage, type Lab3 } from "./color";

const BINS = 256;

/* ========================= OUTILS OT (1D) ========================== */

function cdfOf(hist: Float64Array): Float64Array {
  const cdf = new Float64Array(hist.length);
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    cdf[i] = acc;
  }
  const total = acc || 1;
  for (let i = 0; i < hist.length; i++) cdf[i] /= total;
  return cdf;
}

/** Carte de transport optimal 1D (appariement des quantiles = map de Brenier). */
function quantileLUT(cdfSrc: Float64Array, cdfRef: Float64Array): Float32Array {
  const lut = new Float32Array(cdfSrc.length);
  let j = 0;
  for (let i = 0; i < cdfSrc.length; i++) {
    const p = cdfSrc[i];
    while (j < cdfRef.length - 1 && cdfRef[j] < p) j++;
    lut[i] = j;
  }
  return lut;
}

function histOf(vals: Float32Array, min: number, max: number): Float64Array {
  const hist = new Float64Array(BINS);
  const span = max - min || 1;
  for (let i = 0; i < vals.length; i++) {
    let b = (((vals[i] - min) / span) * BINS) | 0;
    if (b < 0) b = 0;
    if (b >= BINS) b = BINS - 1;
    hist[b]++;
  }
  return hist;
}

/** Distance de Wasserstein W₂ entre deux distributions (fonctions quantiles). */
function wasserstein2(hs: Float64Array, hr: Float64Array, min: number, max: number): number {
  const cs = cdfOf(hs);
  const cr = cdfOf(hr);
  const N = 256;
  let acc = 0;
  let js = 0;
  let jr = 0;
  const span = max - min || 1;
  for (let k = 0; k < N; k++) {
    const p = (k + 0.5) / N;
    while (js < BINS - 1 && cs[js] < p) js++;
    while (jr < BINS - 1 && cr[jr] < p) jr++;
    const d = ((js - jr) / BINS) * span;
    acc += d * d;
  }
  return Math.sqrt(acc / N);
}

export interface ChannelLUTs {
  L: Float32Array;
  a: Float32Array;
  b: Float32Array;
}

function buildLUT(src: Float32Array, ref: Float32Array, min: number, max: number): Float32Array {
  const lutBins = quantileLUT(cdfOf(histOf(src, min, max)), cdfOf(histOf(ref, min, max)));
  const lut = new Float32Array(BINS);
  const span = max - min || 1;
  for (let i = 0; i < BINS; i++) lut[i] = min + ((lutBins[i] + 0.5) / BINS) * span;
  return lut;
}

function applyLUT(vals: Float32Array, lut: Float32Array, min: number, max: number, strength: number): Float32Array {
  const out = new Float32Array(vals.length);
  const span = max - min || 1;
  for (let i = 0; i < vals.length; i++) {
    let b = (((vals[i] - min) / span) * (BINS - 1)) | 0;
    if (b < 0) b = 0;
    if (b >= BINS) b = BINS - 1;
    out[i] = vals[i] + strength * (lut[b] - vals[i]);
  }
  return out;
}

/* ========================= F3 — MASQUE PEAU ======================== */

/** Détection de peau (règles YCbCr + RGB) — équivalent CPU léger du module MediaPipe. */
export function skinMask(d: ImageData, feather: number): Float32Array {
  const w = d.width;
  const h = d.height;
  const n = w * h;
  const p = d.data;
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const r = p[j];
    const g = p[j + 1];
    const b = p[j + 2];
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const ycc = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 177;
    const rgb = r > 60 && g > 30 && b > 15 && r - b > 15 && r - g > 8 && r > g && r > b;
    m[i] = ycc && rgb ? 1 : 0;
  }
  const r = Math.max(2, Math.round((feather * Math.min(w, h)) / 420));
  const blurred = boxBlur(m, w, h, r, 2);
  for (let i = 0; i < n; i++) blurred[i] = smoothstep(0.16, 0.52, blurred[i]);
  return blurred;
}

function maskToVis(mask: Float32Array, d: ImageData): ImageData {
  const n = d.width * d.height;
  const out = new ImageData(d.width, d.height);
  const o = out.data;
  const p = d.data;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const gray = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2];
    const base = gray * 0.42;
    const m = mask[i];
    const k = m * 0.78;
    o[j] = base + (42 - base * 0.2) * k * 0.9 + 18 * m;
    o[j + 1] = base + 212 * k * 0.82;
    o[j + 2] = base + 194 * k * 0.82;
    o[j + 3] = 255;
  }
  return out;
}

/* ====================== F2 — TRANSFERT LAB + OT ==================== */

export interface TransferParams {
  strength: number; // 0..1
  skinProtect: boolean;
  feather: number; // px
}

export interface TransferResult {
  result: ImageData;
  unprotected: ImageData;
  mask: Float32Array;
  maskVis: ImageData;
  luts: ChannelLUTs;
  w2: { L: number; a: number; b: number };
  skinPct: number;
}

export function runTransfer(target: ImageData, targetLab: Lab3, refLab: Lab3, params: TransferParams): TransferResult {
  const n = target.width * target.height;
  const s = clamp01(params.strength);

  const lutL = buildLUT(targetLab.L, refLab.L, 0, 100);
  const lutA = buildLUT(targetLab.a, refLab.a, -128, 127);
  const lutB = buildLUT(targetLab.b, refLab.b, -128, 127);

  const L2 = applyLUT(targetLab.L, lutL, 0, 100, s);
  const A2 = applyLUT(targetLab.a, lutA, -128, 127, s);
  const B2 = applyLUT(targetLab.b, lutB, -128, 127, s);

  const w2 = {
    L: wasserstein2(histOf(targetLab.L, 0, 100), histOf(refLab.L, 0, 100), 0, 100),
    a: wasserstein2(histOf(targetLab.a, -128, 127), histOf(refLab.a, -128, 127), -128, 127),
    b: wasserstein2(histOf(targetLab.b, -128, 127), histOf(refLab.b, -128, 127), -128, 127),
  };

  const unprotected = labToImage({ L: L2, a: A2, b: B2 }, target.width, target.height);

  const mask = skinMask(target, params.feather);
  let skinAcc = 0;
  for (let i = 0; i < n; i++) if (mask[i] > 0.5) skinAcc++;

  const Lf = new Float32Array(n);
  const Af = new Float32Array(n);
  const Bf = new Float32Array(n);
  if (params.skinProtect) {
    for (let i = 0; i < n; i++) {
      const m = mask[i];
      Lf[i] = m * targetLab.L[i] + (1 - m) * L2[i];
      Af[i] = m * targetLab.a[i] + (1 - m) * A2[i];
      Bf[i] = m * targetLab.b[i] + (1 - m) * B2[i];
    }
  } else {
    Lf.set(L2);
    Af.set(A2);
    Bf.set(B2);
  }

  return {
    result: labToImage({ L: Lf, a: Af, b: Bf }, target.width, target.height),
    unprotected,
    mask,
    maskVis: maskToVis(mask, target),
    luts: { L: lutL, a: lutA, b: lutB },
    w2,
    skinPct: (skinAcc / n) * 100,
  };
}

/* La partie 2/2 (F4 texture + F5 DCT) arrive à l'étape 4. */