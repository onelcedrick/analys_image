/** Onglet 01 — F1 : signal & histogrammes (sonde pixel, stats, distributions). */

import { useMemo, useState } from "react";
import type { ImgSlot } from "../lib/imaging";
import { rgbToLab } from "../lib/color";
import { Card, Chip, IconZap, SectionHead, Stat } from "../components/ui";
import { ChannelHistogram } from "../components/charts";
import { CanvasView } from "../components/compare";

interface Probe {
  x: number;
  y: number;
  rgb: [number, number, number];
  lab: [number, number, number];
}

export function SignalTab({ target }: { target: ImgSlot | null }) {
  const [probe, setProbe] = useState<Probe | null>(null);

  const stats = useMemo(() => {
    if (!target) return null;
    const p = target.data.data;
    const n = target.data.width * target.data.height;
    const h = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      h[Math.round(0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2])]++;
    }
    let sum = 0;
    let sum2 = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * h[i];
      sum2 += i * i * h[i];
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    let ent = 0;
    let clipped = 0;
    let acc = 0;
    let p1 = 0;
    let p99 = 255;
    let found1 = false;
    for (let i = 0; i < 256; i++) {
      const pr = h[i] / n;
      if (pr > 0) ent -= pr * Math.log2(pr);
      if (i < 8 || i > 247) clipped += h[i];
      acc += h[i];
      if (!found1 && acc >= n * 0.01) {
        p1 = i;
        found1 = true;
      }
      if (acc <= n * 0.99) p99 = i;
    }
    return { mean, std, ent, clipped: (clipped / n) * 100, p1, p99 };
  }, [target]);

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="F1 · ACQUISITION"
        title="Signal & histogrammes"
        desc="L'image et sa fonction de distribution, en direct. Survolez l'image pour sonder un pixel (RVB + Lab), glissez sur l'histogramme pour zoomer une plage de niveaux."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <Card className="p-4">
          <div
            className="group relative cursor-crosshair"
            onPointerMove={(e) => {
              if (!target) return;
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const x = Math.min(target.data.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * target.data.width)));
              const y = Math.min(target.data.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * target.data.height)));
              const j = (y * target.data.width + x) * 4;
              const p = target.data.data;
              setProbe({ x, y, rgb: [p[j], p[j + 1], p[j + 2]], lab: rgbToLab(p[j], p[j + 1], p[j + 2]) });
            }}
            onPointerLeave={() => setProbe(null)}
          >
            <CanvasView data={target?.data ?? null} className="min-h-[220px]" />
            {probe && target && (
              <>
                <div className="pointer-events-none absolute inset-y-0 w-px bg-amber/50" style={{ left: `${(probe.x / target.data.width) * 100}%` }} />
                <div className="pointer-events-none absolute inset-x-0 h-px bg-amber/50" style={{ top: `${(probe.y / target.data.height) * 100}%` }} />
              </>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[10.5px] text-faint">
              {target ? `${target.name} — ${target.data.width}×${target.data.height} px` : "en attente d'image…"}
            </div>
            {probe && (
              <div className="tabular flex items-center gap-2 rounded-lg border border-line2 bg-bg0/80 px-2.5 py-1 font-mono text-[10.5px]">
                <span className="text-chr">R {probe.rgb[0]}</span>
                <span className="text-chg">G {probe.rgb[1]}</span>
                <span className="text-chb">B {probe.rgb[2]}</span>
                <span className="text-faint">|</span>
                <span className="text-chl">L {probe.lab[0].toFixed(1)}</span>
                <span className="text-faint">a {probe.lab[1].toFixed(1)} · b {probe.lab[2].toFixed(1)}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 content-start gap-3">
          <Stat label="Dimensions" value={target ? `${target.data.width}×${target.data.height}` : "—"} sub={target ? `${((target.data.width * target.data.height) / 1e6).toFixed(2)} Mpx` : undefined} />
          <Stat label="Luma μ ± σ" value={stats ? stats.mean.toFixed(1) : "—"} sub={stats ? `σ ${stats.std.toFixed(1)} / 255` : undefined} tone="text-teal" />
          <Stat label="Entropie" value={stats ? stats.ent.toFixed(2) : "—"} sub="bits / pixel" tone="text-amber" />
          <Stat label="Dynamique p1–p99" value={stats ? `${stats.p1}–${stats.p99}` : "—"} sub="niveaux utiles" />
          <Stat label="Saturés" value={stats ? stats.clipped.toFixed(2) + "%" : "—"} sub="pixels <8 ou >247" tone={stats && stats.clipped > 3 ? "text-rose" : "text-ink"} />
          <Stat label="Canaux" value="R·G·B + L" sub="256 niveaux / canal" />
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold">Histogrammes multidimensionnels</h3>
          <Chip tone="text-teal border-teal/30">
            <IconZap /> temps réel après upload
          </Chip>
        </div>
        <ChannelHistogram data={target?.data ?? null} />
      </Card>
    </div>
  );
}