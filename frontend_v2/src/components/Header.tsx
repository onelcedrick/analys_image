import { MiniHist } from "./charts";
import { Chip } from "./ui";

export default function Header({ mode, setMode, serverUp, checking, base, lumHist }: any) {
  const effectiveServer = mode === "server" && serverUp;
  const label = checking
    ? "détection…"
    : effectiveServer
      ? base
        ? "FastAPI · " + base.replace("http://", "")
        : "FastAPI · même origine"
      : mode === "server"
        ? "serveur hors-ligne → repli local"
        : "moteur navigateur";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur-md">
      <div className="app-container flex h-[58px] items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
            <rect width="34" height="34" rx="8" fill="#111a29" stroke="#2e405f" />
            <rect x="7" y="17" width="4.5" height="10" rx="1.2" fill="#2ad4c2" className="animate-bar-grow" style={{ animationDelay: "0.05s" }} />
            <rect x="14.5" y="8" width="4.5" height="19" rx="1.2" fill="#ffb224" className="animate-bar-grow" style={{ animationDelay: "0.18s" }} />
            <rect x="22" y="12.5" width="4.5" height="14.5" rx="1.2" fill="#f45b8b" className="animate-bar-grow" style={{ animationDelay: "0.31s" }} />
          </svg>
          <div className="leading-none">
            <div className="flex items-center gap-2">
              <span className="font-display text-[19px] font-bold tracking-tight">HistoVision</span>
              <span className="rounded bg-amber px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-[#1a1204]">PRO</span>
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-faint">Analyse histogrammique · Transport optimal</div>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex" title={label}>
          <div className="rounded-lg border border-line bg-panel/70 px-2.5 py-1.5" title="Histogramme de luminance (live)">
            <MiniHist hist={lumHist} />
          </div>
          <div className="hidden flex-col gap-1 lg:flex">
            <div className="flex gap-1.5">
              <Chip tone="text-teal border-teal/30">CIE Lab D65</Chip>
              <Chip tone="text-amber border-amber/30">OT 1D · W₂</Chip>
            </div>
            <div className="flex gap-1.5">
              <Chip tone="text-rose border-rose/30">Skin mask</Chip>
              <Chip tone="text-bluec border-bluec/30">DCT 8×8</Chip>
            </div>
          </div>
          <Chip tone="text-ink border-line2 bg-panel2">v1.0 · 08/2026</Chip>
          <ModeSwitch mode={mode} setMode={setMode} serverUp={serverUp} checking={checking} base={base} />
        </div>
      </div>
      <div className="relative h-[2px] overflow-hidden bg-line/40">
        <div className="animate-scan absolute h-full w-1/3 bg-gradient-to-r from-transparent via-amber to-transparent" />
      </div>
    </header>
  );
}

function ModeSwitch({ mode, setMode, serverUp, checking, base }: any) {
  const effectiveServer = mode === "server" && serverUp;
  const dot = checking ? "bg-amber animate-pulse-dot" : effectiveServer ? "bg-teal" : mode === "server" ? "bg-rose" : "bg-bluec";
  const label = checking
    ? "détection…"
    : effectiveServer
    ? base
      ? "FastAPI · " + base.replace("http://", "")
      : "FastAPI · même origine"
    : mode === "server"
    ? "serveur hors-ligne → repli local"
    : "moteur navigateur";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-2 py-1.5" title={label}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="inline-flex rounded-md bg-bg1 p-0.5">
        {(["server", "browser"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-all ${
              mode === m ? "bg-panel2 text-ink ring-1 ring-line2" : "text-faint hover:text-sub"
            }`}
          >
            {m === "server" ? "Serv." : "Nav."}
          </button>
        ))}
      </div>
      <span className="hidden max-w-[130px] truncate font-mono text-[9px] text-faint xl:block">{label}</span>
    </div>
  );
}
