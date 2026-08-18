const BASE = 'http://localhost:8000';

// Types pour les réponses du backend
export interface ImageMeta {
  id: string;
  width: number;
  height: number;
  channels: number;
  megapixels: number;
  thumb_url: string;
  image_url: string;
  created_at: number;
}

export interface JobRef {
  job_id: string;
  status: string;
}

export interface JobState {
  id: string;
  kind: string;
  status: string;
  image_id: string;
  palette_id?: string | null;
  metrics: Record<string, any>;
  result_url?: string | null;
  error?: string | null;
  created_at: number;
}

export interface TransferParams {
  strength: number;
  skin_protect: boolean;
  feather: number;
}

export interface TextureParams {
  clip: number;
  smooth: number;
  blend: number;
}

/**
 * Étape 1 : Upload d'une image et récupération de son ID
 */
export async function uploadImage(file: File): Promise<ImageMeta> {
  const form = new FormData();
  form.append('file', file);
  
  const res = await fetch(`${BASE}/api/images`, { 
    method: 'POST', 
    body: form 
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Upload failed: ${error}`);
  }
  
  return await res.json();
}

/**
 * Étape 2 : Soumettre une tâche de transfert chromatique
 */
export async function submitTransferJob(
  imageId: string,
  paletteId: string,
  params: TransferParams
): Promise<JobRef> {
  const res = await fetch(`${BASE}/api/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: imageId,
      palette_id: paletteId,
      ...params
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Transfer job failed: ${error}`);
  }
  
  return await res.json();
}

/**
 * Étape 2 : Soumettre une tâche d'amélioration texture
 */
export async function submitTextureJob(
  imageId: string,
  params: TextureParams
): Promise<JobRef> {
  const res = await fetch(`${BASE}/api/texture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: imageId,
      ...params
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Texture job failed: ${error}`);
  }
  
  return await res.json();
}

/**
 * Étape 2 : Soumettre une tâche d'analyse forensique
 */
export async function submitForensicJob(imageId: string): Promise<JobRef> {
  const res = await fetch(`${BASE}/api/forensic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_id: imageId })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Forensic job failed: ${error}`);
  }
  
  return await res.json();
}

/**
 * Étape 3 : Polling - Récupérer l'état d'un job
 */
export async function getJobState(jobId: string): Promise<JobState> {
  const res = await fetch(`${BASE}/api/jobs/${jobId}`);
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get job state: ${error}`);
  }
  
  return await res.json();
}

/**
 * Étape 4 : Télécharger le résultat final
 */
export async function downloadResult(resultUrl: string): Promise<Blob> {
  const res = await fetch(`${BASE}${resultUrl}`);
  
  if (!res.ok) {
    throw new Error(`Failed to download result: ${await res.text()}`);
  }
  
  return await res.blob();
}

/**
 * Helper : Convertir un Blob en ImageData
 */
export async function blobToImageData(blob: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    return c.getContext('2d')!.getImageData(0, 0, img.width, img.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Helper : Convertir ImageData en File pour upload
 */
export function imageDataToFile(img: ImageData, filename = 'image.png'): File {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(img, 0, 0);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], filename, { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * Workflow complet : Upload + Submit + Poll + Download
 */
export async function processWithBackend(
  type: 'transfer' | 'texture' | 'forensic',
  imageFile: File,
  params?: {
    paletteFile?: File;
    strength?: number;
    skin_protect?: boolean;
    feather?: number;
    clip?: number;
    smooth?: number;
    blend?: number;
  }
): Promise<{ result: ImageData; jobId: string; metrics: Record<string, any> }> {
  // Étape 1 : Upload de l'image principale
  const imageMeta = await uploadImage(imageFile);
  
  let paletteId: string | undefined;
  
  // Si transfert avec palette, uploader la palette aussi
  if (type === 'transfer' && params?.paletteFile) {
    const paletteMeta = await uploadImage(params.paletteFile);
    paletteId = paletteMeta.id;
  }
  
  // Étape 2 : Soumettre le job
  let jobRef: JobRef;
  
  if (type === 'transfer') {
    if (!paletteId) throw new Error('Palette required for transfer');
    jobRef = await submitTransferJob(imageMeta.id, paletteId, {
      strength: params?.strength ?? 0.85,
      skin_protect: params?.skin_protect ?? true,
      feather: params?.feather ?? 14
    });
  } else if (type === 'texture') {
    jobRef = await submitTextureJob(imageMeta.id, {
      clip: params?.clip ?? 2.6,
      smooth: params?.smooth ?? 26,
      blend: params?.blend ?? 0.85
    });
  } else {
    jobRef = await submitForensicJob(imageMeta.id);
  }
  
  // Étape 3 : Polling jusqu'à completion
  let jobState: JobState;
  do {
    await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
    jobState = await getJobState(jobRef.job_id);
    
    if (jobState.status === 'error') {
      throw new Error(`Job failed: ${jobState.error}`);
    }
  } while (jobState.status !== 'done');
  
  // Étape 4 : Télécharger le résultat
  if (!jobState.result_url) {
    throw new Error('No result URL in completed job');
  }
  
  const resultBlob = await downloadResult(jobState.result_url);
  const resultData = await blobToImageData(resultBlob);
  
  return {
    result: resultData,
    jobId: jobState.id,
    metrics: jobState.metrics
  };
}
