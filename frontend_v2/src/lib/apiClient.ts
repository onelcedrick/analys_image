/* ------------------------------------------------------------------ */
/*  Client HTTP du backend HistoVision (FastAPI)                       */
/*                                                                     */
/*  Découvre automatiquement la base de l'API : d'abord l'URL relative */
/*  (si le front est servi par le backend), puis http://localhost:8000 */
/*  (CORS déjà autorisé côté serveur).                                 */
/* ------------------------------------------------------------------ */

const CANDIDATE_BASES = ["", "http://localhost:8000"];

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let detectedBase: string | null = null;
let detectionPromise: Promise<string | null> | null = null;

async function probe(base: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Résout (une seule fois) la base de l'API joignable, ou null. */
export function detectApiBase(): Promise<string | null> {
  if (detectedBase !== null) return Promise.resolve(detectedBase);
  if (!detectionPromise) {
    detectionPromise = (async () => {
      for (const base of CANDIDATE_BASES) {
        if (await probe(base)) {
          detectedBase = base;
          return base;
        }
      }
      return null;
    })();
  }
  return detectionPromise;
}

/** Force une re-détection (après bascule de mode, par exemple). */
export function resetApiDetection(): void {
  detectedBase = null;
  detectionPromise = null;
}

export function currentBase(): string {
  return detectedBase ?? "";
}

/** Rend une URL absolue si l'API vit sur une autre origine. */
export function absUrl(path: string): string {
  const base = detectedBase ?? "";
  return path.startsWith("http") ? path : `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await detectApiBase();
  if (base === null) throw new ApiError(0, "Backend injoignable");
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* corps non-JSON : on garde le statut */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/* ----------------------------- contrats ---------------------------- */

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

export interface JobRefOut {
  job_id: string;
  status: string;
}

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobOut {
  id: string;
  kind: string;
  status: JobStatus;
  image_id: string;
  palette_id: string | null;
  metrics: Record<string, unknown>;
  result_url: string | null;
  error: string | null;
  created_at: number;
}

export interface TransferReq {
  image_id: string;
  palette_id: string;
  strength: number;
  skin_protect: boolean;
  feather: number;
}

export interface TextureReq {
  image_id: string;
  clip: number;
  smooth: number;
  blend: number;
}

export interface ForensicReq {
  image_id: string;
}

/* ----------------------------- endpoints --------------------------- */

export function uploadImage(blob: Blob, name: string): Promise<ImageMeta> {
  const form = new FormData();
  form.append("file", blob, name);
  return request<ImageMeta>("/api/images", { method: "POST", body: form });
}

export function requestTransfer(req: TransferReq): Promise<JobRefOut> {
  return request<JobRefOut>("/api/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export function requestTexture(req: TextureReq): Promise<JobRefOut> {
  return request<JobRefOut>("/api/texture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export function requestForensic(req: ForensicReq): Promise<JobRefOut> {
  return request<JobRefOut>("/api/forensic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export function fetchJob(jobId: string): Promise<JobOut> {
  return request<JobOut>(`/api/jobs/${jobId}`);
}

/** Télécharge un résultat binaire (PNG) servi par /storage. */
export async function fetchResultBlob(resultUrl: string): Promise<Blob> {
  const res = await fetch(absUrl(resultUrl));
  if (!res.ok) throw new ApiError(res.status, `Résultat introuvable (${res.status})`);
  return res.blob();
}