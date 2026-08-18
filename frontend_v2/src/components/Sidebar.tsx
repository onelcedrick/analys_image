import { DEMOS } from "../data/demos";
import { Btn, Chip, Card, IconDrop, IconUpload, IconDownload } from "./ui";
import { imageDataToDataURL, downloadPNG } from "../lib/imaging";

export default function Sidebar({ target, palette, fileTargetRef, filePaletteRef, loadDemo }: any) {
  return (
    <aside className="hidden w-[228px] shrink-0 lg:block">
      <div className="sticky top-[78px] space-y-4">
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Prévisualisations</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-faint">CIBLE</div>
              {target ? (
                <img src={imageDataToDataURL(target.data)} alt={target.name} className="h-24 w-full object-cover rounded-md border border-line" />
              ) : (
                <div className="h-24 w-full rounded-md bg-panel2/40 flex items-center justify-center text-faint">Aucune</div>
              )}
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => fileTargetRef.current?.click()}>Changer</Btn>
                <Btn variant="ghost" onClick={() => target && downloadPNG(target.data, `target-${target.name}.png`)} disabled={!target}><IconDownload /> PNG</Btn>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-faint">PALETTE</div>
              {palette ? (
                <img src={imageDataToDataURL(palette.data)} alt={palette.name} className="h-24 w-full object-cover rounded-md border border-line" />
              ) : (
                <div className="h-24 w-full rounded-md bg-panel2/40 flex items-center justify-center text-faint">Aucune</div>
              )}
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => filePaletteRef.current?.click()}>Changer</Btn>
                <Btn variant="ghost" onClick={() => palette && downloadPNG(palette.data, `palette-${palette.name}.png`)} disabled={!palette}><IconDownload /> PNG</Btn>
              </div>
            </div>
          </div>
        </Card>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Banque d'images</span>
            <span className="font-mono text-[10px] text-faint">{DEMOS.length}</span>
          </div>
          <div className="space-y-2">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                onClick={() => loadDemo(d, "target")}
                className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
                  d.label === (target?.name ?? "") ? "border-amber/70 ring-2 ring-amber/20" : d.label === (palette?.name ?? "") ? "border-rose/60 ring-2 ring-rose/15" : "border-line hover:border-line2"
                }`}
              >
                <img src={d.url} alt={d.label} className="h-[74px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                <div className="bg-panel px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-semibold text-ink">{d.label}</span>
                    <span className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wider ${d.meta?.cls ?? ""}`}>
                      <span className={`h-1 w-1 rounded-full ${d.meta?.dot ?? ""}`} />
                      {d.meta?.label ?? ""}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Btn variant="teal" className="w-full" onClick={() => fileTargetRef.current?.click()}>
            <IconUpload /> Importer une cible
          </Btn>
          <Btn variant="ghost" className="w-full" onClick={() => filePaletteRef.current?.click()}>
            <IconDrop /> Importer une palette
          </Btn>
          <p className="text-[10.5px] leading-relaxed text-faint">JPG/PNG · redimensionné auto ≤ 1000 px (perf §3.3).</p>
        </div>

        <Card className="p-3">
          <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Slots actifs</div>
          <div className="flex items-center justify-between gap-2 py-1">
            <span className={`font-mono text-[9.5px] font-bold tracking-wider text-amber`}>CIBLE</span>
            <span className="truncate text-[11px] text-sub">{target?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2 py-1">
            <span className={`font-mono text-[9.5px] font-bold tracking-wider text-rose`}>PALETTE</span>
            <span className="truncate text-[11px] text-sub">{palette?.name ?? "—"}</span>
          </div>
        </Card>
      </div>
    </aside>
  );
}
