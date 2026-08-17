const BASE = 'http://localhost:8000';

export async function serverTransfer(
  target: ImageData,
  palette: ImageData,
  params: { strength: number; skinProtect: boolean; feather: number }
): Promise<{ result: ImageData; unprotected?: ImageData; maskVis?: ImageData }> {
  const blobTarget = imageDataToBlob(target);
  const blobPalette = imageDataToBlob(palette);
  const form = new FormData();
  form.append('target', blobTarget, 'target.png');
  form.append('palette', blobPalette, 'palette.png');
  form.append('strength', String(params.strength));
  form.append('skin_protect', String(params.skinProtect));
  form.append('feather', String(params.feather));
  
  const res = await fetch(`${BASE}/api/transfer`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return {
    result: await blobToImageData(json.result),
    unprotected: json.unprotected ? await blobToImageData(json.unprotected) : undefined,
    maskVis: json.mask_vis ? await blobToImageData(json.mask_vis) : undefined,
  };
}

export async function serverTexture(
  target: ImageData,
  params: { clip: number; smooth: number; blend: number }
): Promise<{ result: ImageData; maskVis?: ImageData; gradVis?: ImageData }> {
  const blob = imageDataToBlob(target);
  const form = new FormData();
  form.append('image', blob, 'image.png');
  form.append('clip_limit', String(params.clip));
  form.append('smooth_sigma', String(params.smooth));
  form.append('blend', String(params.blend));
  
  const res = await fetch(`${BASE}/api/texture`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return {
    result: await blobToImageData(json.result),
    maskVis: json.mask_vis ? await blobToImageData(json.mask_vis) : undefined,
    gradVis: json.grad_vis ? await blobToImageData(json.grad_vis) : undefined,
  };
}

export async function serverForensic(target: ImageData): Promise<{ dctMap: Uint8Array; blockGrid: number[] }> {
  const blob = imageDataToBlob(target);
  const form = new FormData();
  form.append('image', blob, 'image.png');
  
  const res = await fetch(`${BASE}/api/forensic`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function imageDataToBlob(img: ImageData): Blob {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return new Promise<Blob>(resolve => c.toBlob(b => resolve(b!), 'image/png'));
}

async function blobToImageData(blobUrl: string): Promise<ImageData> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = blobUrl;
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  return c.getContext('2d')!.getImageData(0, 0, img.width, img.height);
}
