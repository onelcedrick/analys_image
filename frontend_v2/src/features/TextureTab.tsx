/** Onglet 03 — F4 : histogramme conjoint intensité × gradient, CLAHE ⊕ bilatéral. */

import type { Dispatch, SetStateAction } from "react";
import type { ImgSlot } from "../lib/imaging";
import type { TextureResult } from "../lib/processing";
import { Btn, Card, IconDownload, IconReset, SectionHead, Segmented, Slider } from "../components/ui";
import { JointHistogramCanvas } from "../components/charts";
import { CompareSlider } from "../components/compare";
import { Placeholder } from "./shared";

export interface TextureUiParams {
  clip: number;
  smooth: number;
  blend: number; // 0..100 dans l'UI
}

export type TxView = "result" | "mask" | "gradient";

export function TextureTab({
  target,
  params,
  onParams,
  res,
  view,
  onView,
  onExport,
}: {
  target: ImgSlot | null;
  params: TextureUiParams;
  onParams: Dispatch<SetStateAction<TextureUiParams>>;
  res: TextureResult | null;
  view: TxView;
  onView: (v: TxView) => void;
  onExport: (data: ImageData | null, name: string) => void;
}) {
  const after = view === "result" ? res?.result ?? null : view === "mask" ? res?.maskVis ?? null : res?.gradVis ?? null;

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="F4 · ANALYSE DE TEXTURE 2D"
        title="Histogramme conjoint intensité × gradient"
        desc="Chaque pixel vote dans le plan (intensité, gradient). Le seuil d'Otsu sépare les populations : CLAHE renforce les zones texturées, le filtre bilatéral adoucit les zones lisses — dosage continu par curseurs."
      />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <Slider label="Clip limit — CLAHE" value={params.clip} min={0.5} max={6} step={0.1} color="var(--color-amber)" onChange={(v) => onParams((p) => ({ ...p, clip: v }))} />
            <Slider label="σ couleur — bilatéral (lissage)" value={params.smooth} min={8} max={60} onChange={(v) => onParams((p) => ({ ...p, smooth: v }))} />
            <Slider label="Intensité globale" value={params.blend} min={0} max={100} unit="%" color="var(--color-rose)" onChange={(v) => onParams((p) => ({ ...p, blend: v }))} />
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-sub">Vue</div>
              <Segmented
                value={view}
                onChange={onView}
                options={[
                  { id: "result", label: "Résultat" },
                  { id: "mask", label: "Masque" },
                  { id: "gradient", label: "Gradient" },
                ]}
              />
              <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
                Masque : <span className="text-teal">sarcelle = lisse (bilatéral)</span> · <span className="text-rose">rose = texturé (CLAHE)</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" disabled={!res} onClick={() => onExport(after, "histovision-texture.png")}>
                <IconDownload /> Exporter
              </Btn>
              <Btn onClick={() => onParams({ clip: 2.6, smooth: 26, blend: 85 })}>
                <IconReset />
              </Btn>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-display text-[14px] font-bold">Carte conjointe 2D</h3>
            <p className="mb-3 mt-1 text-[11px] text-faint">32×32 cases · échelle log · ligne = seuil d'Otsu sur le gradient local.</p>
            <JointHistogramCanvas matrix={res?.joint ?? null} otsuYBin={res?.otsuYBin ?? 16} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Seuil Otsu</div>
                <div className="tabular font-display text-[17px] font-bold text-amber">{res ? res.otsuT.toFixed(1) : "—"}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Zone texturée</div>
                <div className="tabular font-display text-[17px] font-bold text-rose">{res ? res.texturedPct.toFixed(1) + "%" : "—"}</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          {target && after ? (
            <CompareSlider
              before={target.data}
              after={after}
              labelA="Originale"
              labelB={view === "result" ? "CLAHE + Bilatéral" : view === "mask" ? "Masque lisse/texturé" : "Gradient Sobel"}
            />
          ) : (
            <Placeholder msg="Analyse de texture en cours…" />
          )}
        </Card>
      </div>
    </div>
  );
}