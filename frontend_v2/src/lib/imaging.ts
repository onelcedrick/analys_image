/* ------------------------------------------------------------------ */
/*  HistoVision Pro — noyau image (chargement, gradients, seuillage)  */
/* ------------------------------------------------------------------ */

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function clampi(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
    img.src = src;
  });
}

/** Redimensionne (si besoin) et rasterise en ImageData — borne le coût CPU (perf §3.3). */
export function toImageData(img: HTMLImageElement, maxSide = 1000): ImageData {
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * s));
  const h = Math.max(1, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Luminance Rec.601 (0..255). */
export function grayFrom(d: ImageData): Float32Array {
  const n = d.width * d.height;
  const out = new Float32Array(n);
  const p = d.data;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    out[i] = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2];
  }
  return out;
}

/** Magnitude du gradient (Sobel 3×3). */
export function sobel(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy) * 0.25;
    }
  }
  return out;
}

/** Flou de boîte séparable (passes multiples ≈ gaussien). */
export function boxBlur(src: Float32Array, w: number, h: number, r: number, passes = 2): Float32Array {
  if (r < 1) return src;
  const n = src.length;
  const b1 = new Float32Array(n);
  const b2 = new Float32Array(n);
  let cur = src;
  let flip = false;
  const div = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    const hDst = flip ? b2 : b1;
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let s = 0;
      for (let i = -r; i <= r; i++) s += cur[row + clampi(i, 0, w - 1)];
      hDst[row] = s / div;
      for (let x = 1; x < w; x++) {
        s += cur[row + Math.min(x + r, w - 1)] - cur[row + Math.max(x - r - 1, 0)];
        hDst[row + x] = s / div;
      }
    }
    // vertical
    const vDst = flip ? b1 : b2;
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += hDst[clampi(i, 0, h - 1) * w + x];
      vDst[x] = s / div;
      for (let y = 1; y < h; y++) {
        s += hDst[Math.min(y + r, h - 1) * w + x] - hDst[Math.max(y - r - 1, 0) * w + x];
        vDst[y * w + x] = s / div;
      }
    }
    cur = vDst;
    flip = !flip;
  }
  return cur;
}

/** Seuillage d'Otsu — retourne le seuil dans le domaine [min, max]. */
export function otsuThreshold(vals: Float32Array, min: number, max: number): number {
  const hist = new Float64Array(256);
  const span = max - min || 1;
  for (let i = 0; i < vals.length; i++) {
    let b = (((vals[i] - min) / span) * 255) | 0;
    if (b < 0) b = 0;
    if (b > 255) b = 255;
    hist[b]++;
  }
  const total = vals.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const bet = wB * wF * (mB - mF) * (mB - mF);
    if (bet > best) {
      best = bet;
      thr = t;
    }
  }
  return min + (thr / 255) * span;
}

/** Histogramme normalisé (probabilités). */
export function histogramF32(vals: Float32Array, bins: number, min: number, max: number): Float64Array {
  const hist = new Float64Array(bins);
  const span = max - min || 1;
  for (let i = 0; i < vals.length; i++) {
    let b = (((vals[i] - min) / span) * bins) | 0;
    if (b < 0) b = 0;
    if (b >= bins) b = bins - 1;
    hist[b]++;
  }
  const n = vals.length || 1;
  for (let i = 0; i < bins; i++) hist[i] /= n;
  return hist;
}

export function percentile(sortedAsc: Float32Array, p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = clampi(Math.floor(p * sortedAsc.length), 0, sortedAsc.length - 1);
  return sortedAsc[idx];
}

/* ------------------------- colormaps ------------------------------ */

type Stop = [number, number, number, number, number]; // t, r, g, b, a

function sampleStops(stops: Stop[], t: number): [number, number, number, number] {
  if (t <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3], stops[0][4]];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, r0, g0, b0, a0] = stops[i - 1];
      const [t1, r1, g1, b1, a1] = stops[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return [
        r0 + (r1 - r0) * k,
        g0 + (g1 - g0) * k,
        b0 + (b1 - b0) * k,
        a0 + (a1 - a0) * k,
      ];
    }
  }
  const l = stops[stops.length - 1];
  return [l[1], l[2], l[3], l[4]];
}

/** Heatmap de suspicion (forensic) : transparent → braise → or. */
const HEAT: Stop[] = [
  [0.0, 0, 0, 0, 0],
  [0.25, 190, 45, 92, 105],
  [0.55, 255, 122, 50, 185],
  [1.0, 255, 216, 110, 242],
];

/** Carte conjointe intensité/gradient : encre → sarcelle → or pâle. */
const JOINT: Stop[] = [
  [0.0, 11, 20, 32, 255],
  [0.3, 20, 84, 90, 255],
  [0.55, 42, 212, 194, 255],
  [0.8, 255, 217, 142, 255],
  [1.0, 255, 246, 230, 255],
];

export function heatColor(t: number): [number, number, number, number] {
  return sampleStops(HEAT, clamp01(t));
}
export function jointColor(t: number): [number, number, number, number] {
  return sampleStops(JOINT, clamp01(t));
}

/* --------------------------- export -------------------------------- */

export function imageDataToDataURL(d: ImageData): string {
  const c = document.createElement("canvas");
  c.width = d.width;
  c.height = d.height;
  c.getContext("2d")!.putImageData(d, 0, 0);
  return c.toDataURL("image/png");
}

export function downloadPNG(d: ImageData, name: string): void {
  const a = document.createElement("a");
  a.href = imageDataToDataURL(d);
  a.download = name;
  a.click();
}