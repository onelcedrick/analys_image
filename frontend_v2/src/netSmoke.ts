/* src/netSmoke.ts — test d'intégration front ⇄ FastAPI (à supprimer ensuite) */
import { detectApiBase, fetchJob, fetchResultBlob, requestTransfer, uploadImage } from "./lib/apiClient";
import { serverTransfer } from "./lib/serverBridge";

function blobOf(d: ImageData): Promise<Blob> {
  return new Promise((res, rej) => {
    const c = document.createElement("canvas");
    c.width = d.width;
    c.height = d.height;
    c.getContext("2d")!.putImageData(d, 0, 0);
    c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png");
  });
}

function flat(v: number, w = 96, h = 72): ImageData {
  const d = new ImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  return d;
}

async function main() {
  const base = await detectApiBase();
  if (base === null) {
    console.warn("[net] KO — backend injoignable (démarrez uvicorn sur :8000 puis rechargez la page)");
    return;
  }
  console.log("[net] base détectée :", base === "" ? "même origine" : base);

  const dark = flat(30);
  const bright = flat(210);

  // 1. round-trip brut : upload → transfert → sondage → PNG
  const t0 = performance.now();
  const img = await uploadImage(await blobOf(dark), "smoke-cible.png");
  const pal = await uploadImage(await blobOf(bright), "smoke-palette.png");
  console.log("[net] uploads OK :", img.id, pal.id, `(${img.width}×${img.height})`);

  const ref = await requestTransfer({
    image_id: img.id,
    palette_id: pal.id,
    strength: 1.0,
    skin_protect: false,
    feather: 14,
  });
  console.log("[net] job accepté :", ref.job_id, "— statut", ref.status);

  let job = await fetchJob(ref.job_id);
  let tries = 0;
  while (job.status !== "done" && job.status !== "error" && tries++ < 100) {
    await new Promise((r) => setTimeout(r, 200));
    job = await fetchJob(ref.job_id);
  }
  if (job.status !== "done") {
    console.error("[net] KO — le job a échoué :", job.error);
    return;
  }
  const png = await fetchResultBlob(job.result_url!);
  const ms = (performance.now() - t0).toFixed(0);
  const metrics = job.metrics ?? {};
  const w2 = (metrics.w2 as { L?: number } | undefined) ?? { L: 0 };
  console.log(`[net] OK — round-trip ${ms} ms · W₂(L*) = ${(w2.L ?? 0).toFixed(1)} · PNG ${png.size} octets`);

  // 2. même chemin via le pont (ce que consommeront les onglets)
  const t1 = performance.now();
  const res = await serverTransfer(dark, bright, { strength: 0.85, skinProtect: true, feather: 10 });
  const mean = res.result.data.reduce((s, v, i) => (i % 4 === 0 ? s + v : s), 0) / (96 * 72);
  console.log(
    `[net] serverBridge OK — ${(performance.now() - t1).toFixed(0)} ms · résultat moyen ${mean.toFixed(0)} (attendu > 150) · peau ${res.skinPct}%`
  );
}

main();