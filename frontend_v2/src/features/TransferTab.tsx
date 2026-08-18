/** Onglet 02 — F2 + F3 : transfert chromatique optimal en CIE Lab + protection peau. */

import type { Dispatch, SetStateAction } from "react";
import type { ImgSlot } from "../lib/imaging";
import type { TransferResult } from "../lib/processing";
import { DEMOS, type DemoImage } from "../data/demos";
import { Btn, Card, Chip, IconDownload, IconReset, IconUpload, SectionHead, Segmented, Slider, Toggle } from "../components/ui";
import { TransferCurves } from "../components/charts";
import { CompareSlider } from "../components/compare";
import { Placeholder } from "./shared";

export interface TransferUiParams {
  strength: number; // 0..100 dans l'UI
  skinProtect: boolean;
  feather: number;
}

export type TrView = "result" | "noprotect" | "mask";

export function TransferTab({
  target,
  palette,
  params,
  onParams,
  res,
  view,
  onView,
  onExport,
  onPaletteDemo,
  onPaletteImport,
  lastOp,
}: {
  target: ImgSlot | null;
  palette: ImgSlot | null;
  params: TransferUiParams;
  onParams: Dispatch<SetStateAction<TransferUiParams>>;
  res: TransferResult | null;
  view: TrView;
  onView: (v: TrView) => void;
  onExport: (data: ImageData | null, name: string) => void;
  onPaletteDemo: (d: DemoImage) => void;
  onPaletteImport: () => void;
  lastOp: { op: string; ms: number } | null;
}) {
  const after = view === "result" ? res?.result ?? null : view === "noprotect" ? res?.unprotected ?? null : res?.maskVis ?? null;

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="F2 + F3 · TRANSPORT OPTIMAL"
        title="Transfert chromatique en CIE Lab"
        desc="La palette de la source est transportée vers la cible via la carte de Brenier (appariement des quantiles — équivalent exact de ot.emd2 en 1D). Le masque peau protège les teints, avec transition featherée."
      />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div>
              <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Source de palette</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMOS.filter((d) => d.kind === "palette").map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onPaletteDemo(d)}
                    className={`group relative overflow-hidden rounded-lg border text-left transition-all ${
                      palette?.name === d.label ? "border-rose ring-2 ring-rose/30" : "border-line hover:border-line2"
                    }`}
                  >
                    <img src={d.url} alt={d.label} className="h-16 w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg0/95 to-transparent px-2 pb-1 pt-3 text-[10px] font-semibold text-ink">
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={onPaletteImport} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line2 py-2 text-[11.5px] text-sub transition-colors hover:border-rose/60 hover:text-rose">
                <IconUpload /> palette personnalisée…
              </button>
            </div>

            <Slider label="Intensité du transfert" value={params.strength} min={0} max={100} unit="%" color="var(--color-amber)" onChange={(v) => onParams((p) => ({ ...p, strength: v }))} />
            <Toggle
              label="Protection sémantique (peau)"
              hint="Le transfert s'applique partout sauf sur la peau — adieu les teints verdâtres."
              checked={params.skinProtect}
              onChange={(v) => onParams((p) => ({ ...p, skinProtect: v }))}
            />
            {params.skinProtect && (
              <Slider label="Flou de bordure (feather)" value={params.feather} min={2} max={30} unit="px" onChange={(v) => onParams((p) => ({ ...p, feather: v }))} />
            )}

            <div>
              <div className="mb-1.5 text-[12px] font-medium text-sub">Vue</div>
              <Segmented
                value={view}
                onChange={onView}
                options={[
                  { id: "result", label: "Résultat" },
                  { id: "noprotect", label: "Sans masque" },
                  { id: "mask", label: "Masque" },
                ]}
              />
            </div>

            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" disabled={!res} onClick={() => onExport(after, "histovision-transfert-lab.png")}>
                <IconDownload /> Exporter
              </Btn>
              <Btn onClick={() => onParams({ strength: 85, skinProtect: true, feather: 14 })}>
                <IconReset />
              </Btn>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[14px] font-bold">Distance W₂ (source ↔ cible)</h3>
              <Chip tone="text-amber border-amber/30">Wasserstein</Chip>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <W2Stat label="L*" v={res?.w2.L} />
              <W2Stat label="a*" v={res?.w2.a} />
              <W2Stat label="b*" v={res?.w2.b} />
            </div>
            <div className="mt-3 space-y-1.5 border-t border-line pt-3 font-mono text-[10.5px] text-faint">
              <div className="flex justify-between">
                <span>Peau détectée (masque &gt; 0.5)</span>
                <span className="tabular text-teal">{res ? res.skinPct.toFixed(1) + " %" : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Dernier calcul</span>
                <span className="tabular text-sub">{lastOp?.op.startsWith("OT") ? lastOp.ms.toFixed(0) + " ms" : "—"}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Courbes de transport (LUT)</div>
              <TransferCurves luts={res?.luts ?? null} />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          {target && after ? (
            <CompareSlider before={target.data} after={after} labelA="Originale" labelB={view === "mask" ? "Masque peau" : view === "noprotect" ? "Transfert brut" : "Transfert protégé"} />
          ) : (
            <Placeholder msg="Calcul du transport optimal en cours…" />
          )}
        </Card>
      </div>
    </div>
  );
}

function W2Stat({ label, v }: { label: string; v?: number }) {
  return (
    <div className="rounded-lg border border-line bg-bg1/60 px-2.5 py-2 text-center transition-colors hover:border-line2">
      <div className="font-mono text-[10px] font-bold text-sub">{label}</div>
      <div className="tabular mt-0.5 font-display text-[16px] font-bold text-amber">{v !== undefined ? v.toFixed(2) : "—"}</div>
      <div className="font-mono text-[8.5px] text-faint">unités canal</div>
    </div>
  );
}