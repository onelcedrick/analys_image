/**
 * HistoVision Pro — shell applicatif.
 *
 * App n'est qu'un assembleur : état global (slots d'images, paramètres,
 * résultats, mode serveur/navigateur), effets de calcul (bifurcation
 * FastAPI ⇄ moteur navigateur) et squelette (header, sidebar, onglets,
 * footer). Chaque onglet vit dans src/features/.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMOS, KIND_META, type DemoImage } from "./data/demos";
import { downloadPNG, loadImage, toImageData, type ImgSlot } from "./lib/imaging";
import { imageToLab } from "./lib/color";
import {
  renderHeatCanvas,
  runForensic,
  runTexture,
  runTransfer,
  type ForensicResult,
  type TextureResult,
  type TransferResult,
} from "./lib/processing";
import { serverForensic, serverTexture, serverTransfer } from "./lib/serverBridge";
import { useServerStatus } from "./hooks/useServerStatus";
import { Btn, BusyBar, Chip, IconDrop, IconLayers, IconScan, IconUpload, IconWave } from "./components/ui";
import { MiniHist } from "./components/charts";
import { ToastProvider, useToast } from "./components/toast";
import { SignalTab } from "./features/SignalTab";
import { TransferTab, type TransferUiParams, type TrView } from "./features/TransferTab";
import { TextureTab, type TextureUiParams, type TxView } from "./features/TextureTab";
import { ForensicTab } from "./features/ForensicTab";

/* ------------------------------------------------------------------ */

type TabId = "signal" | "transfert" | "texture" | "forensic";

const TABS: { id: TabId; n: string; label: string; icon: ReactNode }[] = [
  { id: "signal", n: "01", label: "Signal", icon: <IconWave /> },
  { id: "transfert", n: "02", label: "Transfert Lab", icon: <IconDrop /> },
  { id: "texture", n: "03", label: "Texture", icon: <IconLayers /> },
  { id: "forensic", n: "04", label: "Forensic DCT", icon: <IconScan /> },
];

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const { notify } = useToast();

  /* Les démos sont générées en canvas (hors-ligne) : démarrage immédiat. */
  const [target, setTarget] = useState<ImgSlot | null>(() => ({ name: DEMOS[0].label, data: DEMOS[0].data }));
  const [palette, setPalette] = useState<ImgSlot | null>(() => ({ name: DEMOS[1].label, data: DEMOS[1].data }));
  const [tab, setTab] = useState<TabId>("signal");

  /* ---- Bascule Serveur (FastAPI) ⇄ Navigateur (repli local) ---- */
  const { serverUp, base, checking } = useServerStatus();
  const [mode, setMode] = useState<"server" | "browser">("server");
  const useServer = mode === "server" && serverUp;

  const [trParams, setTrParams] = useState<TransferUiParams>({ strength: 85, skinProtect: true, feather: 14 });
  const [trRes, setTrRes] = useState<TransferResult | null>(null);
  const [trView, setTrView] = useState<TrView>("result");

  const [txParams, setTxParams] = useState<TextureUiParams>({ clip: 2.6, smooth: 26, blend: 85 });
  const [txRes, setTxRes] = useState<TextureResult | null>(null);
  const [txView, setTxView] = useState<TxView>("result");

  const [fxRes, setFxRes] = useState<ForensicResult | null>(null);
  const [fxOpacity, setFxOpacity] = useState(72);

  const [busy, setBusy] = useState<string | null>(null);
  const [lastOp, setLastOp] = useState<{ op: string; ms: number } | null>(null);

  const fileTargetRef = useRef<HTMLInputElement | null>(null);
  const filePaletteRef = useRef<HTMLInputElement | null>(null);

  /* --------------------------- dérivés ------------------------------ */
  const targetLab = useMemo(() => (target ? imageToLab(target.data) : null), [target]);
  const paletteLab = useMemo(() => (palette ? imageToLab(palette.data) : null), [palette]);

  const lumHist = useMemo(() => {
    if (!target) return null;
    const h = new Uint32Array(256);
    const p = target.data.data;
    const n = target.data.width * target.data.height;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      h[Math.round(0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2])]++;
    }
    return h;
  }, [target]);

  /* --------------------- F2 : transfert (live) ---------------------- */
  useEffect(() => {
    if (!target || !palette) return;
    if (!useServer && (!targetLab || !paletteLab)) return;
    let active = true;
    setBusy(useServer ? "Transfert sur le serveur — POT ot.emd2…" : "Transport optimal en CIE Lab…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const params = {
          strength: trParams.strength / 100,
          skinProtect: trParams.skinProtect,
          feather: trParams.feather,
        };
        const res = useServer
          ? await serverTransfer(target.data, palette.data, params)
          : await new Promise<TransferResult>((resolve) =>
              setTimeout(() => resolve(runTransfer(target.data, targetLab!, paletteLab!, params)), 130)
            );
        if (!active) return;
        setTrRes(res);
        setLastOp({ op: useServer ? "OT Lab · serveur (F2+F3)" : "OT Lab · navigateur (F2+F3)", ms: performance.now() - t0 });
      } catch (e) {
        if (active) notify(`Transfert serveur en échec — ${(e as Error).message}`);
      } finally {
        if (active) setBusy(null);
      }
    };
    run();
    return () => {
      active = false;
      setBusy(null);
    };
  }, [target, palette, targetLab, paletteLab, trParams, useServer, notify]);

  /* --------------------- F4 : texture (live) ------------------------ */
  useEffect(() => {
    if (!target) return;
    let active = true;
    setBusy(useServer ? "Texture sur le serveur — CLAHE/bilatéral…" : "Histogramme conjoint + CLAHE/bilatéral…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const params = { clip: txParams.clip, smooth: txParams.smooth, blend: txParams.blend / 100 };
        const res = useServer
          ? await serverTexture(target.data, params)
          : await new Promise<TextureResult>((resolve) => setTimeout(() => resolve(runTexture(target.data, params)), 160));
        if (!active) return;
        setTxRes(res);
        setLastOp({ op: useServer ? "Texture · serveur (F4)" : "Texture · navigateur (F4)", ms: performance.now() - t0 });
      } catch (e) {
        if (active) notify(`Texture serveur en échec — ${(e as Error).message}`);
      } finally {
        if (active) setBusy(null);
      }
    };
    run();
    return () => {
      active = false;
      setBusy(null);
    };
  }, [target, txParams, useServer, notify]);

  /* ------------------- invalidations ------------------------------- */
  useEffect(() => {
    setFxRes(null);
    setTrRes(null);
    setTxRes(null);
  }, [target]);

  /* Le résultat forensic dépend du moteur : on le purge au changement de mode. */
  useEffect(() => {
    setFxRes(null);
  }, [useServer]);

  /* --------------------------- actions ------------------------------ */
  const loadFile = useCallback(
    (file: File, as: "target" | "palette") => {
      const url = URL.createObjectURL(file);
      loadImage(url)
        .then((img) => {
          const data = toImageData(img, as === "target" ? 1000 : 700);
          if (as === "target") setTarget({ name: file.name, data });
          else setPalette({ name: file.name, data });
          notify(`${as === "target" ? "Cible" : "Palette"} chargée — ${file.name}`);
        })
        .catch(() => notify("Fichier illisible (JPG/PNG attendus)"));
    },
    [notify]
  );

  const loadDemo = useCallback(
    (d: DemoImage, as: "target" | "palette") => {
      const slot: ImgSlot = { name: d.label, data: d.data };
      if (as === "target") setTarget(slot);
      else setPalette(slot);
      notify(as === "target" ? `Cible : ${d.label}` : `Palette : ${d.label}`);
    },
    [notify]
  );

  const runForensicNow = () => {
    if (!target || busy) return;
    setBusy(useServer ? "DCT 8×8 sur le serveur — SciPy…" : "DCT 8×8 — analyse forensique…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const res = useServer
          ? await serverForensic(target.data)
          : await new Promise<ForensicResult>((resolve) => setTimeout(() => resolve(runForensic(target.data)), 60));
        setFxRes(res);
        setLastOp({ op: useServer ? "Forensic DCT · serveur (F5)" : "Forensic DCT · navigateur (F5)", ms: performance.now() - t0 });
      } catch (e) {
        notify(`Forensic serveur en échec — ${(e as Error).message}`);
      } finally {
        setBusy(null);
      }
    };
    run();
  };

  const exportImage = (data: ImageData | null, name: string) => {
    if (!data) return;
    downloadPNG(data, name);
    notify(`PNG exporté — ${name}`);
  };

  const exportHeatmap = () => {
    if (!target || !fxRes) return;
    const c = document.createElement("canvas");
    c.width = target.data.width;
    c.height = target.data.height;
    const ctx = c.getContext("2d")!;
    ctx.putImageData(target.data, 0, 0);
    ctx.globalAlpha = fxOpacity / 100;
    ctx.drawImage(renderHeatCanvas(fxRes), 0, 0, c.width, c.height);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "histovision-heatmap-dct.png";
    a.click();
    notify("Heatmap DCT exportée — histovision-heatmap-dct.png");
  };

  /* ------------------------------ rendu ----------------------------- */
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* fond ambiant */}
      <div className="glow-field pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-grid pointer-events-none fixed inset-0 -z-10" />

      {/* ============================ HEADER =========================== */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
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

          <div className="ml-auto hidden items-center gap-3 md:flex">
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

      {/* ============================= CORPS =========================== */}
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 gap-5 px-4 py-5 sm:px-6">
        {/* -------- sidebar banque d'images -------- */}
        <aside className="hidden w-[228px] shrink-0 lg:block">
          <div className="sticky top-[78px] space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Banque d'images</span>
                <span className="font-mono text-[10px] text-faint">{DEMOS.length}</span>
              </div>
              <div className="space-y-2">
                {DEMOS.map((d) => (
                  <DemoRow
                    key={d.id}
                    d={d}
                    isTarget={target?.name === d.label}
                    isPalette={palette?.name === d.label}
                    meta={KIND_META[d.kind]}
                    onTarget={() => loadDemo(d, "target")}
                    onPalette={() => loadDemo(d, "palette")}
                  />
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

            <div className="rounded-xl border border-line bg-panel p-3">
              <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Slots actifs</div>
              <SlotLine label="CIBLE" name={target?.name ?? "—"} tone="text-amber" />
              <SlotLine label="PALETTE" name={palette?.name ?? "—"} tone="text-rose" />
            </div>
          </div>
        </aside>

        {/* -------- colonne principale -------- */}
        <main className="min-w-0 flex-1">
          {/* bande démo mobile */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                onClick={() => loadDemo(d, "target")}
                className={`shrink-0 overflow-hidden rounded-lg border transition-all ${target?.name === d.label ? "border-amber ring-2 ring-amber/30" : "border-line"}`}
              >
                <img src={d.url} alt={d.label} className="h-14 w-20 object-cover" loading="lazy" />
              </button>
            ))}
          </div>

          {/* barre d'onglets */}
          <nav className="mb-1 flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`group relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-[13px] font-semibold transition-colors ${
                  tab === t.id ? "text-ink" : "text-sub hover:text-ink"
                }`}
              >
                <span className={`font-mono text-[10px] font-bold ${tab === t.id ? "text-amber" : "text-faint"}`}>{t.n}</span>
                <span className={tab === t.id ? "text-teal" : "text-faint group-hover:text-sub"}>{t.icon}</span>
                {t.label}
                <span
                  className={`absolute inset-x-2 bottom-0 h-[2px] origin-left rounded-full bg-amber transition-transform duration-300 ${
                    tab === t.id ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            ))}
          </nav>
          <div className="py-2">
            <BusyBar label={busy} />
          </div>

          {tab === "signal" && <SignalTab target={target} />}

          {tab === "transfert" && (
            <TransferTab
              target={target}
              palette={palette}
              params={trParams}
              onParams={setTrParams}
              res={trRes}
              view={trView}
              onView={setTrView}
              onExport={exportImage}
              onPaletteDemo={(d) => loadDemo(d, "palette")}
              onPaletteImport={() => filePaletteRef.current?.click()}
              lastOp={lastOp}
            />
          )}

          {tab === "texture" && (
            <TextureTab target={target} params={txParams} onParams={setTxParams} res={txRes} view={txView} onView={setTxView} onExport={exportImage} />
          )}

          {tab === "forensic" && (
            <ForensicTab
              target={target}
              res={fxRes}
              opacity={fxOpacity}
              onOpacity={setFxOpacity}
              onRun={runForensicNow}
              onExportHeatmap={exportHeatmap}
              running={!!busy}
            />
          )}
        </main>
      </div>

      {/* ============================ FOOTER =========================== */}
      <footer className="mt-auto border-t border-line bg-bg1/70">
        <div className="mx-auto flex h-10 max-w-[1500px] items-center gap-4 px-4 font-mono text-[10.5px] text-faint sm:px-6">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse-dot bg-amber" : "bg-teal"}`} />
            <span className={busy ? "text-amber" : "text-sub"}>{busy ?? "pipeline idle — prêt"}</span>
          </span>
          <span className="hidden sm:inline">
            {target ? `${target.data.width}×${target.data.height} px · ${((target.data.width * target.data.height) / 1e6).toFixed(2)} Mpx` : "aucune image"}
          </span>
          {lastOp && (
            <span className="tabular hidden text-teal md:inline">
              {lastOp.op} : {lastOp.ms.toFixed(0)} ms
            </span>
          )}
          <span className="ml-auto">{useServer ? "moteur : FastAPI (POT · OpenCV · SciPy)" : "moteur : navigateur · zéro upload"}</span>
        </div>
      </footer>

      {/* inputs cachés */}
      <input ref={fileTargetRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "target")} />
      <input ref={filePaletteRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "palette")} />
    </div>
  );
}

/* --------------------------- sous-composants ------------------------ */

function ModeSwitch({
  mode,
  setMode,
  serverUp,
  checking,
  base,
}: {
  mode: "server" | "browser";
  setMode: (m: "server" | "browser") => void;
  serverUp: boolean;
  checking: boolean;
  base: string;
}) {
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

function DemoRow({
  d,
  isTarget,
  isPalette,
  meta,
  onTarget,
  onPalette,
}: {
  d: DemoImage;
  isTarget: boolean;
  isPalette: boolean;
  meta: { label: string; cls: string; dot: string };
  onTarget: () => void;
  onPalette: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isTarget ? "border-amber/70 ring-2 ring-amber/20" : isPalette ? "border-rose/60 ring-2 ring-rose/15" : "border-line hover:border-line2"
      }`}
    >
      <button onClick={onTarget} className="block w-full text-left" title="Définir comme cible">
        <img src={d.url} alt={d.label} className="h-[74px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
        <div className="bg-panel px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[11px] font-semibold text-ink">{d.label}</span>
            <span className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wider ${meta.cls}`}>
              <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
        </div>
      </button>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="pointer-events-auto cursor-pointer rounded bg-bg0/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber ring-1 ring-amber/40" onClick={onTarget} title="Utiliser comme cible">
          CIBLE
        </span>
        <span className="pointer-events-auto cursor-pointer rounded bg-bg0/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose ring-1 ring-rose/40" onClick={onPalette} title="Utiliser comme palette">
          PALETTE
        </span>
      </div>
      {isTarget && <span className="absolute left-1.5 top-1.5 rounded bg-amber px-1.5 py-px font-mono text-[8.5px] font-bold text-[#1a1204] group-hover:opacity-0">CIBLE</span>}
      {isPalette && <span className="absolute left-1.5 top-1.5 rounded bg-rose px-1.5 py-px font-mono text-[8.5px] font-bold text-white group-hover:opacity-0">PALETTE</span>}
    </div>
  );
}

function SlotLine({ label, name, tone }: { label: string; name: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className={`font-mono text-[9.5px] font-bold tracking-wider ${tone}`}>{label}</span>
      <span className="truncate text-[11px] text-sub">{name}</span>
    </div>
  );
}