import { imageToLab, rgbToLab } from './color';

export async function processImageTransfer(imageDataUrl: string): Promise<any> {
  // Simulation du traitement de transfert Lab
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        processedImage: imageDataUrl,
        histogram: {
          r: Array.from({ length: 256 }, (_, i) => Math.random() * 100),
          g: Array.from({ length: 256 }, (_, i) => Math.random() * 100),
          b: Array.from({ length: 256 }, (_, i) => Math.random() * 100)
        },
        transferCurve: Array.from({ length: 256 }, (_, i) => i + Math.sin(i * 0.1) * 20)
      });
    }, 500);
  });
}

export async function processTextureAnalysis(imageDataUrl: string): Promise<any> {
  // Simulation du traitement de texture
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        processedImage: imageDataUrl,
        textureMap: imageDataUrl
      });
    }, 500);
  });
}

export async function processForensicDCT(imageDataUrl: string): Promise<any> {
  // Simulation du traitement forensic DCT
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        processedImage: imageDataUrl,
        dctHeatmap: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => Math.random()))
      });
    }, 500);
  });
}

export function runTransfer(
  target: ImageData,
  targetLab: Float32Array,
  paletteLab: Float32Array,
  params: { strength: number; skinProtect: boolean; feather: number }
): { result: ImageData; unprotected?: ImageData; maskVis?: ImageData } {
  const n = targetLab.length / 3;
  const result = new ImageData(target.width, target.height);
  const unprotected = new ImageData(target.width, target.height);
  
  // Histogrammes L, a, b
  const histT_L = new Uint32Array(256);
  const histP_L = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    histT_L[Math.round(targetLab[i*3])]++;
    histP_L[Math.round(paletteLab[i*3])]++;
  }
  
  // CDF et mapping OT 1D
  const cdfT = new Float32Array(256);
  const cdfP = new Float32Array(256);
  let sumT = 0, sumP = 0;
  for (let i = 0; i < 256; i++) {
    sumT += histT_L[i]; sumP += histP_L[i];
    cdfT[i] = sumT / n; cdfP[i] = sumP / n;
  }
  
  const mapL = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let j = 0;
    while (j < 255 && cdfP[j] < cdfT[i]) j++;
    mapL[i] = j;
  }
  
  // Masque peau simple (Cb/Cr dans YCbCr approx)
  const mask = new Float32Array(n);
  const src = target.data;
  for (let i = 0; i < n; i++) {
    const r = src[i*4], g = src[i*4+1], b = src[i*4+2];
    const y = 0.299*r + 0.587*g + 0.114*b;
    const cb = -0.169*r - 0.331*g + 0.5*b + 128;
    const cr = 0.5*r - 0.419*g - 0.081*b + 128;
    const isSkin = cb > 100 && cb < 140 && cr > 135 && cr < 170;
    mask[i] = isSkin ? 1 : 0;
  }
  
  // Application du transfert
  for (let i = 0; i < n; i++) {
    let L = targetLab[i*3], a = targetLab[i*3+1], bVal = targetLab[i*3+2];
    const mL = mapL[Math.max(0, Math.min(255, Math.round(L)))];
    const skinFactor = params.skinProtect ? (1 - mask[i] * 0.7) : 1;
    L = L + (mL - L) * params.strength * skinFactor;
    
    // Lab vers RGB simplifié
    const Y = (L + 16) / 116;
    const X = Y + a / 500;
    const Z = Y - bVal / 200;
    const r = 255 * (3.2406*(X**3) - 1.5372*(Y**3) + 0.4986*(Z**3));
    const g = 255 * (-0.9689*(X**3) + 1.8758*(Y**3) - 0.0415*(Z**3));
    const bl = 255 * (0.0557*(X**3) - 0.2040*(Y**3) + 1.0570*(Z**3));
    
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    result.data[i*4] = clamp(r);
    result.data[i*4+1] = clamp(g);
    result.data[i*4+2] = clamp(bl);
    result.data[i*4+3] = 255;
    
    unprotected.data[i*4] = clamp(r);
    unprotected.data[i*4+1] = clamp(g);
    unprotected.data[i*4+2] = clamp(bl);
    unprotected.data[i*4+3] = 255;
  }
  
  // Visualisation masque
  const maskVis = new ImageData(target.width, target.height);
  for (let i = 0; i < n; i++) {
    const v = Math.round(mask[i] * 255);
    maskVis.data[i*4] = v;
    maskVis.data[i*4+1] = v;
    maskVis.data[i*4+2] = v;
    maskVis.data[i*4+3] = 255;
  }
  
  return { result, unprotected, maskVis };
}

export function runTexture(
  target: ImageData,
  params: { clip: number; smooth: number; blend: number }
): { result: ImageData; maskVis?: ImageData; gradVis?: ImageData } {
  const result = new ImageData(target.width, target.height);
  const src = target.data;
  
  // CLAHE simplifié + flou bilatéral approximatif
  for (let i = 0; i < src.length; i += 4) {
    let lum = 0.299*src[i] + 0.587*src[i+1] + 0.114*src[i+2];
    lum = Math.min(255, Math.max(0, lum + (lum - 128) * params.clip * 0.1));
    const factor = lum / (0.299*src[i] + 0.587*src[i+1] + 0.114*src[i+2] || 1);
    result.data[i] = Math.min(255, Math.max(0, src[i] * factor));
    result.data[i+1] = Math.min(255, Math.max(0, src[i+1] * factor));
    result.data[i+2] = Math.min(255, Math.max(0, src[i+2] * factor));
    result.data[i+3] = 255;
  }
  
  return { result };
}

export function runForensic(target: ImageData): { dctMap: Uint8Array; blockGrid: number[] } {
  const n = target.width * target.height;
  const dctMap = new Uint8Array(n);
  
  // Simulation DCT 8x8 - détection de blocs
  for (let y = 0; y < target.height; y += 8) {
    for (let x = 0; x < target.width; x += 8) {
      const blockEnergy = Math.random() * 255;
      for (let dy = 0; dy < 8 && y+dy < target.height; dy++) {
        for (let dx = 0; dx < 8 && x+dx < target.width; dx++) {
          dctMap[(y+dy)*target.width + (x+dx)] = blockEnergy;
        }
      }
    }
  }
  
  return { dctMap, blockGrid: [] };
}

export function renderHeatCanvas(fxRes: { dctMap: Uint8Array }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const size = Math.sqrt(fxRes.dctMap.length);
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  
  for (let i = 0; i < fxRes.dctMap.length; i++) {
    const v = fxRes.dctMap[i];
    img.data[i*4] = v;
    img.data[i*4+1] = 255 - v;
    img.data[i*4+2] = 0;
    img.data[i*4+3] = 180;
  }
  
  ctx.putImageData(img, 0, 0);
  return c;
}
