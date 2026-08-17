export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function toImageData(img: HTMLImageElement, maxDim = 1000): ImageData {
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export function downloadPNG(data: ImageData | string, name: string) {
  let url: string;
  if (typeof data === 'string') {
    url = data;
  } else {
    const c = document.createElement('canvas');
    c.width = data.width;
    c.height = data.height;
    c.getContext('2d')!.putImageData(data, 0, 0);
    url = c.toDataURL('image/png');
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = name.endsWith('.png') ? name : `${name}.png`;
  a.click();
}
