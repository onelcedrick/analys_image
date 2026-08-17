/* ------------------------------------------------------------------ */
/*  Espace CIE Lab (illuminant D65) — conversion sRGB réversible      */
/* ------------------------------------------------------------------ */

const EPS = 216 / 24389;
const KAPPA = 24389 / 27;
const Xn = 0.95047;
const Yn = 1.0;
const Zn = 1.08883;

function srgbToLin(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linToSrgb(c: number): number {
  if (c < 0) c = 0;
  if (c > 1) c = 1;
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
}

function f(t: number): number {
  return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

function fInv(t: number): number {
  const t3 = t * t * t;
  return t3 > EPS ? t3 : (116 * t - 16) / KAPPA;
}

export interface Lab3 {
  L: Float32Array;
  a: Float32Array;
  b: Float32Array;
}

export function imageToLab(d: ImageData): Lab3 {
  const n = d.width * d.height;
  const p = d.data;
  const L = new Float32Array(n);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const r = srgbToLin(p[j]);
    const g = srgbToLin(p[j + 1]);
    const bl = srgbToLin(p[j + 2]);
    const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * bl) / Xn;
    const Y = (0.2126729 * r + 0.7151522 * g + 0.072175 * bl) / Yn;
    const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * bl) / Zn;
    const fx = f(X);
    const fy = f(Y);
    const fz = f(Z);
    L[i] = 116 * fy - 16;
    a[i] = 500 * (fx - fy);
    b[i] = 200 * (fy - fz);
  }
  return { L, a, b };
}

export function labToImage(lab: Lab3, w: number, h: number): ImageData {
  const n = w * h;
  const out = new ImageData(w, h);
  const p = out.data;
  for (let i = 0; i < n; i++) {
    const fy = (lab.L[i] + 16) / 116;
    const fx = fy + lab.a[i] / 500;
    const fz = fy - lab.b[i] / 200;
    const X = fInv(fx) * Xn;
    const Y = fInv(fy) * Yn;
    const Z = fInv(fz) * Zn;
    const r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    const g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
    const b = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
    const j = i * 4;
    p[j] = linToSrgb(r);
    p[j + 1] = linToSrgb(g);
    p[j + 2] = linToSrgb(b);
    p[j + 3] = 255;
  }
  return out;
}

/** Lab d'un pixel unique (sonde RVB → Lab). */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLin(r);
  const gl = srgbToLin(g);
  const bl = srgbToLin(b);
  const X = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / Xn;
  const Y = (0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl) / Yn;
  const Z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / Zn;
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}