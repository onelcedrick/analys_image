import { Btn, Card, IconDownload, IconUpload } from "./ui";
import { downloadPNG, imageDataToDataURL } from "../lib/imaging";

export default function Sidebar({ target, fileTargetRef }: any) {
  const activeImage = target;

  return (
    <aside className="w-full shrink-0 lg:w-[300px]">
      <div className="sticky top-[78px]">
        <Card className="overflow-hidden border border-line/80 bg-panel/85 p-4 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.9)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">Photo active</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">Cible</h3>
            </div>
            <span className="rounded-full border border-teal/40 bg-teal/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-teal">
              {activeImage ? "OK" : "VIDE"}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-panel2 via-panel to-bg1">
            {activeImage ? (
              <img
                src={imageDataToDataURL(activeImage.data)}
                alt={activeImage.name}
                className="h-[230px] w-full object-cover sm:h-[260px] lg:h-[300px]"
              />
            ) : (
              <div className="flex h-[230px] w-full items-center justify-center bg-panel2/50 text-sm text-faint sm:h-[260px] lg:h-[300px]">
                Aucune photo chargée
              </div>
            )}
          </div>

          {activeImage && (
            <div className="mt-4 rounded-xl border border-line/80 bg-bg1/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{activeImage.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                  {activeImage.data.width}×{activeImage.data.height}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Btn variant="teal" className="w-full" onClick={() => fileTargetRef.current?.click()}>
              <IconUpload /> Importer
            </Btn>
            <Btn
              variant="ghost"
              className="w-full"
              onClick={() => activeImage && downloadPNG(activeImage.data, `target-${activeImage.name}.png`)}
              disabled={!activeImage}
            >
              <IconDownload /> Exporter PNG
            </Btn>
          </div>

          <div className="mt-4 space-y-2 border-t border-line/80 pt-4 text-[11px] text-sub">
            <div className="flex items-center justify-between gap-3">
              <span className="text-faint">Format</span>
              <span className="font-medium text-ink">JPG / PNG</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-faint">Traitement</span>
              <span className="font-medium text-ink">Auto redimension</span>
            </div>
          </div>
        </Card>
      </div>
    </aside>
  );
}
