/** Onglet 04 — F5 (bonus) : détection de falsification par DCT 8×8. */

import type { ImgSlot } from "../lib/imaging";
import type { ForensicResult } from "../lib/processing";
import { Btn, Card, Chip, IconDownload, IconPlay, IconScan, SectionHead, Slider } from "../components/ui";
import { CoeffHistogram } from "../components/charts";
import { CanvasView, HeatOverlay } from "../components/compare";
import { Placeholder } from "./shared";

export function ForensicTab({
  target,
  res,
  opacity,
  onOpacity,
  onRun,
  onExportHeatmap,
  running,
}: {
  target: ImgSlot | null;
  res: ForensicResult | null;
  opacity: number;
  onOpacity: (v: number) => void;
  onRun: () => void;
  onExportHeatmap: () => void;
  running: boolean;
}) {
  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="FORENSIC"
        title="Analyse visuelle de cohérence"
        desc="Comparaison locale des blocs d’image pour repérer des variations de fréquence, des zones recollées ou des artefacts visuels susceptibles d’indiquer une modification."
      />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <Btn variant="primary" className="w-full" onClick={onRun} disabled={!target || running}>
              <IconPlay /> Lancer l'analyse DCT
            </Btn>
            <Slider label="Opacité de la heatmap" value={opacity} min={0} max={100} unit="%" color="var(--color-rose)" onChange={onOpacity} />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Blocs suspects</div>
                <div className="tabular font-display text-[17px] font-bold text-rose">{res ? res.flaggedPct.toFixed(1) + "%" : "—"}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Score moyen</div>
                <div className="tabular font-display text-[17px] font-bold text-amber">{res ? res.meanScore.toFixed(3) : "—"}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Grille DCT</div>
                <div className="tabular font-display text-[17px] font-bold text-teal">{res ? `${res.bw}×${res.bh}` : "—"}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Bande AC</div>
                <div className="tabular font-display text-[17px] font-bold text-ink">{res ? "22 coef" : "—"}</div>
              </div>
            </div>
            <Btn className="w-full" onClick={onExportHeatmap} disabled={!res}>
              <IconDownload /> Exporter la heatmap
            </Btn>
            <div className="rounded-lg border border-bluec/25 bg-bluec/5 p-2.5 font-mono text-[10.5px] leading-relaxed text-bluec/90">
              Méthode : KL(bloc ‖ modèle global) sur les coefficients AC (3 ≤ u+v ≤ 6) + ratio de zéros. Essayez « Lac · ballon suspect » depuis la banque d'images.
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            {target ? (
              <div className="relative overflow-hidden rounded-lg">
                <CanvasView data={target.data} />
                {res && <HeatOverlay forensic={res} opacity={opacity} />}
                {!res && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg0/50 backdrop-blur-[2px]">
                    <div className="rounded-xl border border-line2 bg-panel/90 px-4 py-3 text-center">
                      <div className="font-mono text-[11px] text-faint">aucun scan sur cette image</div>
                      <button onClick={onRun} className="mt-1.5 inline-flex items-center gap-2 rounded-lg bg-rose/15 px-3 py-1.5 text-[12px] font-semibold text-rose ring-1 ring-rose/40 transition-colors hover:bg-rose/25">
                        <IconScan /> Scanner maintenant
                      </button>
                    </div>
                  </div>
                )}
                {res && (
                  <span className="absolute bottom-2.5 right-2.5 rounded-md bg-bg0/80 px-2 py-0.5 font-mono text-[10px] text-rose ring-1 ring-rose/40">
                    suspicion DCT · {res.flaggedPct.toFixed(0)}% de blocs &gt; 0.65
                  </span>
                )}
              </div>
            ) : (
              <Placeholder msg="Chargez une image…" />
            )}
          </Card>
          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-[14px] font-bold">Histogramme des coefficients AC (modèle global)</h3>
              <Chip tone="text-amber border-amber/30">pic en 0 = quantification</Chip>
            </div>
            <CoeffHistogram hist={res?.hist ?? null} />
          </Card>
        </div>
      </div>
    </div>
  );
}