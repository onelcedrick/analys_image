import { useMemo, useState } from "react";
import { Card, SectionHead, Slider } from "./components/ui";
import { ChannelHistogram, CoeffHistogram, JointHistogramCanvas, MiniHist, TransferCurves } from "./components/charts";
import { CompareSlider } from "./components/compare";
import { runTransfer } from "./lib/processing";
import { imageToLab } from "./lib/color";
import type { ChannelLUTs } from "./lib/processing";

function synthImage(w: number, h: number, seed: number): ImageData {
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const d = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const grad = (x / w) * 180;
      d.data[i] = Math.min(255, grad + rnd() * 60);
      d.data[i + 1] = Math.min(255, (y / h) * 140 + rnd() * 70);
      d.data[i + 2] = Math.min(255, 40 + rnd() * 90 + grad * 0.3);
      d.data[i + 3] = 255;
    }
  }
  return d;
}

export function VizShowroom() {
  const [opacity, setOpacity] = useState(70);

  const image = useMemo(() => synthImage(320, 220, 7), []);
  const brighter = useMemo(() => synthImage(320, 220, 13), []);

  const transfer = useMemo(
    () => runTransfer(image, imageToLab(image), imageToLab(brighter), { strength: 1, skinProtect: false, feather: 10 }),
    [image, brighter]
  );

  const joint = useMemo(() => {
    const m = new Float32Array(32 * 32);
    let s = 42;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let gy = 0; gy < 32; gy++)
      for (let gx = 0; gx < 32; gx++)
        m[gy * 32 + gx] = Math.pow(rnd(), 2.2) * (gy < 10 ? 1 : 0.25);
    return m;
  }, []);

  const coeff = useMemo(() => {
    const h = new Float32Array(41);
    for (let i = 0; i < 41; i++) h[i] = Math.exp(-((i - 20) ** 2) / 18) * (i === 20 ? 3 : 1);
    return h;
  }, []);

  const lum = useMemo(() => {
    const h = new Uint32Array(256);
    const p = image.data;
    for (let i = 0; i < p.length; i += 4) h[Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])]++;
    return h;
  }, [image]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-6">
      <SectionHead
        k="VISUALISATIONS · ÉTAPE 6"
        title="Banc d'essai des graphiques"
        desc="Histogramme RVB (glissez pour zoomer, survolez pour sonder), courbes de transport, carte conjointe, coefficients AC, comparateur avant/après — sur données synthétiques."
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold">Histogrammes multidimensionnels — F1</h3>
          <MiniHist hist={lum} />
        </div>
        <ChannelHistogram data={image} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-display text-[15px] font-bold">Courbes de transport — F2</h3>
          <TransferCurves luts={transfer.luts as ChannelLUTs} />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-display text-[15px] font-bold">Carte conjointe 32×32 — F4</h3>
          <JointHistogramCanvas matrix={joint} otsuYBin={12} />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-display text-[15px] font-bold">Coefficients AC — F5</h3>
          <CoeffHistogram hist={coeff} />
          <div className="mt-3">
            <Slider label="Opacité heatmap (démo)" value={opacity} min={0} max={100} unit="%" color="var(--color-rose)" onChange={setOpacity} />
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-display text-[15px] font-bold">Avant / Après — F6</h3>
          <CompareSlider before={image} after={transfer.result} labelA="Originale" labelB="Transfert Lab" />
        </Card>
      </div>
    </div>
  );
}