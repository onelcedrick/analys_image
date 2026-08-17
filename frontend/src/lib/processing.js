export function renderHeatCanvas(fxRes) {
  const c = document.createElement('canvas');
  c.width = fxRes.width;
  c.height = fxRes.height;
  const ctx = c.getContext('2d');
  const imgData = ctx.createImageData(c.width, c.height);
  const data = imgData.data;
  const scores = fxRes.scores;
  for (let i = 0; i < scores.length; i++) {
    const s = Math.min(1, Math.max(0, scores[i]));
    const r = s * 255;
    const g = (1 - s) * 255;
    const b = 50;
    data[i*4] = r;
    data[i*4+1] = g;
    data[i*4+2] = b;
    data[i*4+3] = 180;
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

export function runTransfer(targetData, targetLab, paletteLab, params) {
  const { strength, skinProtect, feather } = params;
  const w = targetData.width;
  const h = targetData.height;
  const n = w * h;
  const result = new Uint8ClampedArray(n * 4);
  
  // Simple histogram matching simulation
  const tL = new Float32Array(n);
  for (let i = 0; i < n; i++) tL[i] = targetLab[i*3];
  
  // Sort for OT
  const sortedT = [...tL].sort((a,b) => a-b);
  const sortedP = [...paletteLab].sort((a,b) => a-b);
  
  // Build mapping
  const map = new Map();
  for (let i = 0; i < n; i++) {
    map.set(sortedT[i], sortedP[Math.floor(i * strength)]);
  }
  
  const src = targetData.data;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const L = targetLab[i*3];
    const a = targetLab[i*3+1];
    const b = targetLab[i*3+2];
    
    // Apply transfer
    const mappedL = map.get(L) || L;
    
    // Lab to RGB (simplified)
    const Y = (mappedL + 16) / 116;
    const X = a / 500 + Y;
    const Z = Y - b / 200;
    
    const xr = X > 0.206893 ? X*X*X : (X - 16/116) / 7.787;
    const yr = Y > 0.206893 ? Y*Y*Y : (Y - 16/116) / 7.787;
    const zr = Z > 0.206893 ? Z*Z*Z : (Z - 16/116) / 7.787;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    let rr = xr * xn * 3.2404542 - yr * yn * 1.5371385 - zr * zn * 0.4985314;
    let gg = -xr * xn * 0.9692660 + yr * yn * 1.8760108 + zr * zn * 0.0415560;
    let bb = xr * xn * 0.0556434 - yr * yn * 0.2040259 + zr * zn * 1.0572252;
    
    rr = rr > 0.0031308 ? 1.055 * Math.pow(rr, 1/2.4) - 0.055 : 12.92 * rr;
    gg = gg > 0.0031308 ? 1.055 * Math.pow(gg, 1/2.4) - 0.055 : 12.92 * gg;
    bb = bb > 0.0031308 ? 1.055 * Math.pow(bb, 1/2.4) - 0.055 : 12.92 * bb;
    
    result[j] = Math.min(255, Math.max(0, rr * 255));
    result[j+1] = Math.min(255, Math.max(0, gg * 255));
    result[j+2] = Math.min(255, Math.max(0, bb * 255));
    result[j+3] = 255;
  }
  
  return {
    result: new ImageData(result, w, h),
    unprotected: null,
    maskVis: null
  };
}

export function runTexture(targetData, params) {
  const { clip, smooth, blend } = params;
  const w = targetData.width;
  const h = targetData.height;
  const n = w * h;
  const src = targetData.data;
  const result = new Uint8ClampedArray(n * 4);
  
  // Simple CLAHE-like effect
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    let r = src[j], g = src[j+1], b = src[j+2];
    
    // Enhance contrast
    const factor = 1 + (clip / 10);
    r = Math.min(255, Math.max(0, r * factor));
    g = Math.min(255, Math.max(0, g * factor));
    b = Math.min(255, Math.max(0, b * factor));
    
    result[j] = r;
    result[j+1] = g;
    result[j+2] = b;
    result[j+3] = 255;
  }
  
  // Generate gradient visualization
  const gradVis = new ImageData(new Uint8ClampedArray(result), w, h);
  const maskVis = new ImageData(new Uint8ClampedArray(n * 4), w, h);
  
  return {
    result: new ImageData(result, w, h),
    gradVis,
    maskVis
  };
}

export function runForensic(targetData) {
  const w = targetData.width;
  const h = targetData.height;
  const n = w * h;
  const scores = new Float32Array(n);
  
  // Simulate DCT anomaly detection
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    // Block artifacts at 8x8 boundaries
    if (x % 8 === 0 || y % 8 === 0) {
      scores[i] = Math.random() * 0.3 + 0.7;
    } else {
      scores[i] = Math.random() * 0.3;
    }
  }
  
  return { width: w, height: h, scores };
}
