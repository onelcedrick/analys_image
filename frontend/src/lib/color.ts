export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rn = r / 255, gn = g / 255, bn = b / 255;
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;
  const x = (rn * 0.4124 + gn * 0.3576 + bn * 0.1805) / 0.95047;
  const y = (rn * 0.2126 + gn * 0.7152 + bn * 0.0722) / 1.0;
  const z = (rn * 0.0193 + gn * 0.1192 + bn * 0.9505) / 1.08883;
  const xf = x > 0.008856 ? Math.pow(x, 1/3) : 7.787 * x + 16/116;
  const yf = y > 0.008856 ? Math.pow(y, 1/3) : 7.787 * y + 16/116;
  const zf = z > 0.008856 ? Math.pow(z, 1/3) : 7.787 * z + 16/116;
  const L = 116 * yf - 16;
  const a = 500 * (xf - yf);
  const bVal = 200 * (yf - zf);
  return [L, a, bVal];
}

export function imageToLab(img: ImageData): Float32Array {
  const n = img.width * img.height;
  const lab = new Float32Array(n * 3);
  const d = img.data;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const [L, a, b] = rgbToLab(d[j], d[j+1], d[j+2]);
    lab[i*3] = L; lab[i*3+1] = a; lab[i*3+2] = b;
  }
  return lab;
}
