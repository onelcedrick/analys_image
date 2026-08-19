/** Onglet 02 — F2 + F3 : transfert chromatique optimal en CIE Lab + protection peau. */

import type { Dispatch, SetStateAction } from "react";
import { imageDataToDataURL, type ImgSlot } from "../lib/imaging";
import type { TransferResult } from "../lib/processing";
import type { PalettePreset } from "../App";
import { Btn, Card, Chip, IconDownload, IconReset, IconUpload, SectionHead, Segmented, Slider } from "../components/ui";
import { CompareSlider } from "../components/compare";
import { Placeholder } from "./shared";

export interface TransferUiParams {
  strength: number; // 0..100 dans l'UI
  skinProtect: boolean;
  feather: number;
}

export type TrView = "result" | "mask";

export function TransferTab({
  target,
  palette,
  presets,
  params,
  onParams,
  res,
  view,
  onView,
  onExport,
  onPaletteImport,
  onPalettePreset,
  lastOp,
}: {
  target: ImgSlot | null;
  palette: ImgSlot | null;
  presets: PalettePreset[];
  params: TransferUiParams;
  onParams: Dispatch<SetStateAction<TransferUiParams>>;
  res: TransferResult | null;
  view: TrView;
  onView: (v: TrView) => void;
  onExport: (data: ImageData | null, name: string) => void;
  onPaletteImport: () => void;
  onPalettePreset: (preset: PalettePreset) => void;
  lastOp: { op: string; ms: number } | null;
}) {
  const after = view === "result" ? res?.result ?? null : res?.maskVis ?? null;

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="TRANSFER LAB"
        title="Transfert chromatique"
        desc="Applique une palette source à la cible tout en conservant des teintes naturelles et en protégeant les zones de peau."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">Palette source</p>
                <h3 className="mt-1 text-[16px] font-semibold text-ink">Choisir une référence</h3>
              </div>
              <Chip tone="text-amber border-amber/30">Lab</Chip>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onPalettePreset(preset)}
                  className={`group overflow-hidden rounded-xl border text-left transition-all ${
                    palette?.name === preset.label ? "border-rose ring-2 ring-rose/30" : "border-line hover:border-line2"
                  }`}
                  title={preset.label}
                >
                  <img src={imageDataToDataURL(preset.data)} alt={preset.label} className="h-16 w-full object-cover" loading="lazy" />
                  <span className="block bg-panel px-2 py-1 text-center text-[10px] font-semibold text-ink">{preset.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onPaletteImport}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line2 py-2.5 text-[11.5px] font-medium text-sub transition-colors hover:border-rose/60 hover:text-rose"
            >
              <IconUpload /> Palette personnalisée
            </button>

            <div className="mt-4 space-y-4">
              <Slider label="Intensité" value={params.strength} min={0} max={100} unit="%" color="var(--color-amber)" onChange={(v) => onParams((p) => ({ ...p, strength: v }))} />

              <div className="rounded-xl border border-line bg-bg1/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-sub">Protection peau</span>
                  <button
                    type="button"
                    onClick={() => onParams((p) => ({ ...p, skinProtect: !p.skinProtect }))}
                    className={`rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] transition-colors ${
                      params.skinProtect ? "bg-teal/12 text-teal ring-1 ring-teal/30" : "bg-panel2 text-faint ring-1 ring-line"
                    }`}
                  >
                    {params.skinProtect ? "activée" : "désactivée"}
                  </button>
                </div>
                {params.skinProtect && (
                  <Slider label="Transition de bordure" value={params.feather} min={2} max={30} unit="px" onChange={(v) => onParams((p) => ({ ...p, feather: v }))} />
                )}
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium text-sub">Vue</div>
                <Segmented
                  value={view}
                  onChange={onView}
                  options={[
                    { id: "result", label: "Résultat" },
                    { id: "mask", label: "Masque" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
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
              <h3 className="font-display text-[14px] font-bold">Performance</h3>
              <Chip tone="text-amber border-amber/30">W₂</Chip>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <W2Stat label="L*" v={res?.w2.L} />
              <W2Stat label="a*" v={res?.w2.a} />
              <W2Stat label="b*" v={res?.w2.b} />
            </div>
            <div className="mt-3 space-y-2 border-t border-line pt-3 font-mono text-[10.5px] text-faint">
              <div className="flex items-center justify-between">
                <span>Peau conservée</span>
                <span className="tabular text-teal">{res ? res.skinPct.toFixed(1) + " %" : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Dernier calcul</span>
                <span className="tabular text-sub">{lastOp ? `${lastOp.ms.toFixed(0)} ms` : "—"}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Aperçu</p>
              <h3 className="mt-1 text-[16px] font-semibold text-ink">Comparatif cible / résultat</h3>
            </div>
            <div className="rounded-full border border-line bg-panel2/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-sub">
              {view === "mask" ? "masque" : "final"}
            </div>
          </div>

          {target && after ? (
            <CompareSlider before={target.data} after={after} labelA="Originale" labelB={view === "mask" ? "Masque peau" : "Transfert final"} />
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