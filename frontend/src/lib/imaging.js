export async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function toImageData(img, maxDim) {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function downloadPNG(imageData, name) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}

export function rgbToLab(r, g, b) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  rr *= 100; gg *= 100; bb *= 100;
  const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375;
  const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750;
  const z = rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041;
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = t => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + (16 / 116);
  const L = (116 * f(y / yn)) - 16;
  const a = 500 * (f(x / xn) - f(y / yn));
  const b_val = 200 * (f(y / yn) - f(z / zn));
  return [L, a, b_val];
}

export function imageToLab(imageData) {
  const data = imageData.data;
  const n = data.length / 4;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const [L, a, b] = rgbToLab(data[j], data[j+1], data[j+2]);
    lab[i*3] = L;
    lab[i*3+1] = a;
    lab[i*3+2] = b;
  }
  return lab;
}
