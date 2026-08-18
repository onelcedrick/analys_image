/* ------------------------------------------------------------------ */
/*  Pont Serveur : exécute F2/F4/F5 sur le backend FastAPI et ramène   */
/*  les résultats sous la forme attendue par l'interface (mêmes types */
/*  que le moteur navigateur). Le repli navigateur reste inchangé.     */
/* ------------------------------------------------------------------ */

import {
  fetchJob,
  fetchResultBlob,
  requestForensic,
  requestTexture,
  requestTransfer,
  uploadImage,
  type JobOut,
} from "./apiClient";
import type { TransferResult } from "./processing";

const POLL_MS = 300;
const MAX_WAIT_MS = 60_000;

/* Local result types (the processing module only exports TransferResult for now) */
export interface TextureResult {
  result: ImageData;
  maskVis: ImageData;
  gradVis: ImageData;
  joint: Float32Array;
  jointRawMax: number;
  otsuT: number;
  otsuYBin: number;
  texturedPct: number;
}

export interface ForensicResult {
  scores: Float32Array;
  bw: number;
  bh: number;
  cropW: number;
  cropH: number;
  hist: Float32Array;
  flaggedPct: number;
  meanScore: number;
}

/* --------------------------- conversions --------------------------- */

function imageDataToBlob(data: ImageData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    canvas.getContext("2d")!.putImageData(data, 0, 0);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob a échoué"))), "image/png");
  });
}

async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** ImageData vide 1×1 pour les vues non fournies par le serveur. */
function emptyImageData(): ImageData {
  return new ImageData(1, 1);
}

async function upload(data: ImageData): Promise<string> {
  const blob = await imageDataToBlob(data);
  const meta = await uploadImage(blob, "import.png");
  return meta.id;
}

async function awaitJob(jobId: string): Promise<JobOut> {
  const deadline = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const job = await fetchJob(jobId);
    if (job.status === "done" || job.status === "error") {
      if (job.status === "error") throw new Error(job.error ?? "Échec du job serveur");
      return job;
    }
    if (Date.now() > deadline) throw new Error("Délai d'attente du job dépassé");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/* ------------------------- F2 : transfert -------------------------- */

export async function serverTransfer(
  target: ImageData,
  palette: ImageData,
  params: { strength: number; skinProtect: boolean; feather: number }
): Promise<TransferResult> {
  const [imageId, paletteId] = await Promise.all([upload(target), upload(palette)]);
  const ref = await requestTransfer({
    image_id: imageId,
    palette_id: paletteId,
    strength: params.strength,
    skin_protect: params.skinProtect,
    feather: params.feather,
  });
  const job = await awaitJob(ref.job_id);
  const m = job.metrics as {
    w2: { L: number; a: number; b: number };
    luts: { L: number[]; a: number[]; b: number[] };
    skin_pct: number;
  };
  const result = await blobToImageData(await fetchResultBlob(job.result_url!));
  return {
    result,
    unprotected: emptyImageData(),
    mask: new Float32Array(0),
    maskVis: emptyImageData(),
    luts: {
      L: Float32Array.from(m.luts.L),
      a: Float32Array.from(m.luts.a),
      b: Float32Array.from(m.luts.b),
    },
    w2: m.w2,
    skinPct: m.skin_pct,
  };
}

/* -------------------------- F4 : texture --------------------------- */

export async function serverTexture(
  target: ImageData,
  params: { clip: number; smooth: number; blend: number }
): Promise<TextureResult> {
  const imageId = await upload(target);
  const ref = await requestTexture({
    image_id: imageId,
    clip: params.clip,
    smooth: params.smooth,
    blend: params.blend,
  });
  const job = await awaitJob(ref.job_id);
  const m = job.metrics as {
    otsu_threshold: number;
    textured_pct: number;
    joint_histogram: number[][];
  };
  const result = await blobToImageData(await fetchResultBlob(job.result_url!));
  const joint = new Float32Array(32 * 32);
  m.joint_histogram.forEach((row, gy) => row.forEach((v, gx) => (joint[gy * 32 + gx] = v)));
  return {
    result,
    maskVis: emptyImageData(),
    gradVis: emptyImageData(),
    joint,
    jointRawMax: 1,
    otsuT: m.otsu_threshold,
    // Le serveur ne renvoie pas le bin Otsu sur l'axe gradient : on le place
    // hors champ (32) pour ne pas tracer de ligne parasite sur la carte.
    otsuYBin: 32,
    texturedPct: m.textured_pct,
  };
}

/* ------------------------- F5 : forensic --------------------------- */

export async function serverForensic(target: ImageData): Promise<ForensicResult> {
  const imageId = await upload(target);
  const ref = await requestForensic({ image_id: imageId });
  const job = await awaitJob(ref.job_id);
  const m = job.metrics as {
    blocks_w: number;
    blocks_h: number;
    flagged_pct: number;
    mean_score: number;
    coeff_hist: number[];
    heatmap: number[][];
  };
  const scores = new Float32Array(m.blocks_w * m.blocks_h);
  m.heatmap.forEach((row, by) => row.forEach((v, bx) => (scores[by * m.blocks_w + bx] = v)));
  return {
    scores,
    bw: m.blocks_w,
    bh: m.blocks_h,
    cropW: m.blocks_w * 8,
    cropH: m.blocks_h * 8,
    hist: Float32Array.from(m.coeff_hist),
    flaggedPct: m.flagged_pct,
    meanScore: m.mean_score,
  };
}