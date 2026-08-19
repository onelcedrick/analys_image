const envBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const CANDIDATE_BASES = [envBase, "", "http://127.0.0.1:8000", "http://localhost:8000"].filter(Boolean);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let detectedBase: string | null | undefined = undefined;
let detectionPromise: Promise<string | null> | null = null;

async function probe(base: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${base}/api/health`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return false;
    const body = await res.json().catch(() => null);
    return !!body && (body.status === "ok" || body.status === "healthy");
  } catch {
    return false;
  }
}

export function detectApiBase(): Promise<string | null> {
  if (detectedBase !== undefined) return Promise.resolve(detectedBase);
  if (!detectionPromise) {
    detectionPromise = (async () => {
      for (const base of CANDIDATE_BASES) {
        if (await probe(base)) {
          detectedBase = base;
          return base;
        }
      }
      detectedBase = null;
      return null;
    })();
  }
  return detectionPromise;
}

export function resetApiDetection(): void {
  detectedBase = undefined;
  detectionPromise = null;
}

export function currentBase(): string {
  return detectedBase ?? "";
}

export function absUrl(path: string): string {
  const base = detectedBase ?? "";
  return path.startsWith("http") ? path : `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await detectApiBase();
  if (base === null) throw new ApiError(0, "Backend injoignable — lancez uvicorn sur :8000");
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ImageMeta {
  id: string;
  filename: string;
  width: number;
  height: number;
  content_type?: string;
}

export interface JobRefOut {
  job_id: string;
  status: string;
}

export interface JobOut {
  id: string;
  status: string;
  kind?: string;
  result_url?: string | null;
  metrics?: Record<string, unknown> | null;
  error?: string | null;
}

export async function uploadImage(blob: Blob, filename = "upload.png"): Promise<ImageMeta> {
  const form = new FormData();
  form.append("file", blob, filename);
  return request<ImageMeta>("/api/images", { method: "POST", body: form });
}

export async function requestTransfer(body: {
  image_id: string;
  palette_id: string;
  strength?: number;
  skin_protect?: boolean;
  feather?: number;
}): Promise<JobRefOut> {
  return request<JobRefOut>("/api/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function requestTexture(body: {
  image_id: string;
  clip?: number;
  smooth?: number;
  blend?: number;
}): Promise<JobRefOut> {
  return request<JobRefOut>("/api/texture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function requestForensic(body: { image_id: string }): Promise<JobRefOut> {
  return request<JobRefOut>("/api/forensic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchJob(jobId: string): Promise<JobOut> {
  return request<JobOut>(`/api/jobs/${jobId}`);
}

export async function fetchResultBlob(resultUrl: string): Promise<Blob> {
  const res = await fetch(absUrl(resultUrl));
  if (!res.ok) throw new ApiError(res.status, `Résultat introuvable (${res.status})`);
  return res.blob();
}