/** Onglet 03 — F4 : amélioration de texture visuelle. */

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
  blend: number;
}

export type TxView = "result" | "mask";

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
  const after = view === "result" ? res?.result ?? null : res?.maskVis ?? null;

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="TEXTURE"
        title="Amélioration de texture"
        desc="Renforce les détails locaux et adoucit les zones homogènes pour donner plus de relief sans bruit visuel excessif."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">Paramètres</p>
                <h3 className="mt-1 text-[16px] font-semibold text-ink">Contrôle de texture</h3>
              </div>
              <div className="rounded-full border border-line bg-panel2/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-sub">2D</div>
            </div>

            <Slider label="CLAHE — contraste" value={params.clip} min={0.5} max={6} step={0.1} color="var(--color-amber)" onChange={(v) => onParams((p) => ({ ...p, clip: v }))} />
            <Slider label="Lissage — bilatéral" value={params.smooth} min={8} max={60} onChange={(v) => onParams((p) => ({ ...p, smooth: v }))} />
            <Slider label="Mélange final" value={params.blend} min={0} max={100} unit="%" color="var(--color-rose)" onChange={(v) => onParams((p) => ({ ...p, blend: v }))} />

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
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[14px] font-bold">Carte de distribution</h3>
              <div className="rounded-full border border-teal/30 bg-teal/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-teal">32×32</div>
            </div>
            <JointHistogramCanvas matrix={res?.joint ?? null} otsuYBin={res?.otsuYBin ?? 16} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Seuil</div>
                <div className="tabular font-display text-[17px] font-bold text-amber">{res ? res.otsuT.toFixed(1) : "—"}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg1/60 px-3 py-2">
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Texture</div>
                <div className="tabular font-display text-[17px] font-bold text-rose">{res ? res.texturedPct.toFixed(1) + "%" : "—"}</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Aperçu</p>
              <h3 className="mt-1 text-[16px] font-semibold text-ink">Comparatif avant / après</h3>
            </div>
            <div className="rounded-full border border-line bg-panel2/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-sub">
              {view === "mask" ? "masque" : "final"}
            </div>
          </div>

          {target && after ? (
            <CompareSlider
              before={target.data}
              after={after}
              labelA="Originale"
              labelB={view === "mask" ? "Masque texture" : "Texture améliorée"}
            />
          ) : (
            <Placeholder msg="Analyse de texture en cours…" />
          )}
        </Card>
      </div>
    </div>
  );
}