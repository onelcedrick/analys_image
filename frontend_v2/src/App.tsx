/**
 * HistoVision Pro — shell applicatif.
 *
 * App n'est qu'un assembleur : état global (slots d'images, paramètres,
 * résultats, mode serveur/navigateur), effets de calcul (bifurcation
 * FastAPI ⇄ moteur navigateur) et squelette (header, sidebar, onglets,
 * footer). Chaque onglet vit dans src/features/.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { downloadPNG, loadImage, toImageData, imageDataToDataURL, type ImgSlot } from "./lib/imaging";
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
import { uploadToServer, serverTransferById, serverTextureById, serverForensicById } from "./lib/serverBridge";
import { useServerStatus } from "./hooks/useServerStatus";
import { BusyBar, IconDrop, IconLayers, IconScan, IconWave } from "./components/ui";
import { ToastProvider, useToast } from "./components/toast";
import { SignalTab } from "./features/SignalTab";
import { TransferTab, type TransferUiParams, type TrView } from "./features/TransferTab";
import { TextureTab, type TextureUiParams, type TxView } from "./features/TextureTab";
import { ForensicTab } from "./features/ForensicTab";
import Sidebar from "./components/Sidebar";

/* ------------------------------------------------------------------ */

type TabId = "signal" | "transfert" | "texture" | "forensic";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "signal", label: "Signal", icon: <IconWave /> },
  { id: "transfert", label: "Transfer Lab", icon: <IconDrop /> },
  { id: "texture", label: "Texture", icon: <IconLayers /> },
  { id: "forensic", label: "Forensic", icon: <IconScan /> },
];

const UPLOADED_IMAGES_KEY = "histovision-uploaded-images-v1";

type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export type PalettePreset = {
  id: string;
  label: string;
  data: ImageData;
};

function makePalettePreset(id: string, label: string, colors: string[]): PalettePreset {
  const w = 180;
  const h = 120;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  colors.forEach((color, index) => {
    g.addColorStop(index / (colors.length - 1), color);
  });
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 0, w, h * 0.22);

  return { id, label, data: ctx.getImageData(0, 0, w, h) };
}

const PALETTE_PRESETS: PalettePreset[] = [
  makePalettePreset("warm", "Chaud", ["#f8d7a1", "#f59e0b", "#b45309", "#5b2d0a"]),
  makePalettePreset("cool", "Froid", ["#dbeaef", "#38bdf8", "#1d4ed8", "#0f172a"]),
  makePalettePreset("garden", "Nature", ["#d9f99d", "#4ade80", "#15803d", "#14532d"]),
];

function readUploadedImages(): UploadedImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UPLOADED_IMAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const unique: UploadedImage[] = [];

    for (const item of parsed) {
      if (!item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.dataUrl !== "string") continue;
      if (seen.has(item.dataUrl)) continue;
      seen.add(item.dataUrl);
      unique.push(item);
    }

    return unique;
  } catch {
    return [];
  }
}

function makeUploadedId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const { notify } = useToast();

  const [target, setTarget] = useState<ImgSlot | null>(null);
  const [palette, setPalette] = useState<ImgSlot | null>(() => ({ name: PALETTE_PRESETS[0].label, data: PALETTE_PRESETS[0].data }));
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => readUploadedImages());
  const [tab, setTab] = useState<TabId>("signal");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const compact = uploadedImages.slice(0, 12);
      window.localStorage.setItem(UPLOADED_IMAGES_KEY, JSON.stringify(compact));
    } catch (error) {
      console.warn("localStorage quota exceeded while persisting uploaded images:", error);
      notify("Mémoire locale saturée — stockage des images limité");
      try {
        window.localStorage.removeItem(UPLOADED_IMAGES_KEY);
      } catch {
        // noop: ne rien faire si le navigateur refuse aussi la suppression
      }
    }
  }, [notify, uploadedImages]);

  /* ---- Bascule Serveur (FastAPI) ⇄ Navigateur (repli local) ---- */
  const { serverUp } = useServerStatus();
  const useServer = serverUp;

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
        let res: TransferResult;
        if (useServer) {
          // ensure target and palette uploaded once
          if (!target.id) {
            const id = await uploadToServer(target.data);
            setTarget((s) => (s ? { ...s, id } : s));
            // reflect locally
            target.id = id;
          }
          if (!palette.id) {
            const id = await uploadToServer(palette.data);
            setPalette((s) => (s ? { ...s, id } : s));
            palette.id = id;
          }
          res = await serverTransferById(target.id!, palette.id!, params);
        } else {
          res = await new Promise<TransferResult>((resolve) => setTimeout(() => resolve(runTransfer(target.data, targetLab!, paletteLab!, params)), 130));
        }
        if (!active) return;
        setTrRes(res);
        setLastOp({ op: useServer ? "Transport Lab · serveur" : "Transport Lab · navigateur", ms: performance.now() - t0 });
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
        let res: TextureResult;
        if (useServer) {
          if (!target.id) {
            const id = await uploadToServer(target.data);
            setTarget((s) => (s ? { ...s, id } : s));
            target.id = id;
          }
          res = await serverTextureById(target.id!, params);
        } else {
          res = await new Promise<TextureResult>((resolve) => setTimeout(() => resolve(runTexture(target.data, params)), 160));
        }
        if (!active) return;
        setTxRes(res);
        setLastOp({ op: useServer ? "Texture · serveur" : "Texture · navigateur", ms: performance.now() - t0 });
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
  const applyPresetPalette = useCallback((preset: PalettePreset) => {
    setPalette({ name: preset.label, data: preset.data });
    notify(`Palette : ${preset.label}`);
  }, [notify]);

  const addUploadedImage = useCallback((imageData: ImageData, name: string) => {
    const dataUrl = imageDataToDataURL(imageData, "image/jpeg", 0.8);
    const safeName = name || "image";
    setUploadedImages((prev) => {
      const existsIndex = prev.findIndex((item) => item.dataUrl === dataUrl);
      if (existsIndex >= 0) {
        const next = [...prev];
        next.splice(existsIndex, 1);
        next.unshift({ id: prev[existsIndex].id, name: safeName, dataUrl });
        return next.slice(0, 12);
      }
      return [{ id: makeUploadedId(), name: safeName, dataUrl }, ...prev].slice(0, 12);
    });
  }, []);

  const selectStoredImage = useCallback(
    (item: UploadedImage, as: "target" | "palette") => {
      loadImage(item.dataUrl)
        .then((img) => {
          const data = toImageData(img, as === "target" ? 1000 : 700);
          if (as === "target") setTarget({ name: item.name, data });
          else setPalette({ name: item.name, data });
          notify(`${as === "target" ? "Cible" : "Palette"} : ${item.name}`);
        })
        .catch(() => notify("Image enregistrée illisible (JPG/PNG attendus)"));
    },
    [notify]
  );

  const removeUploadedImage = useCallback(
    (id: string) => {
      setUploadedImages((prev) => prev.filter((item) => item.id !== id));
      const deleted = uploadedImages.find((item) => item.id === id);
      if (!deleted) return;
      const deletedUrl = deleted.dataUrl;
      if (target && imageDataToDataURL(target.data) === deletedUrl) {
        setTarget(null);
      }
      if (palette && imageDataToDataURL(palette.data) === deletedUrl) {
        setPalette(null);
      }
      notify(`Image supprimée — ${deleted.name}`);
    },
    [notify, palette, target, uploadedImages]
  );

  const loadFile = useCallback(
    (file: File, as: "target" | "palette") => {
      const url = URL.createObjectURL(file);
      loadImage(url)
        .then((img) => {
          const data = toImageData(img, as === "target" ? 1000 : 700);
          addUploadedImage(data, file.name);
          if (as === "target") setTarget({ name: file.name, data });
          else setPalette({ name: file.name, data });
          notify(`${as === "target" ? "Cible" : "Palette"} chargée — ${file.name}`);
        })
        .catch(() => notify("Fichier illisible (JPG/PNG attendus)"))
        .finally(() => {
          URL.revokeObjectURL(url);
        });
    },
    [addUploadedImage, notify]
  );

  const runForensicNow = () => {
    if (!target || busy) return;
    setBusy(useServer ? "DCT 8×8 sur le serveur — SciPy…" : "DCT 8×8 — analyse forensique…");
    const run = async () => {
      const t0 = performance.now();
      try {
        let res: ForensicResult;
        if (useServer) {
          if (!target.id) {
            const id = await uploadToServer(target.data);
            setTarget((s) => (s ? { ...s, id } : s));
            target.id = id;
          }
          res = await serverForensicById(target.id!);
        } else {
          res = await new Promise<ForensicResult>((resolve) => setTimeout(() => resolve(runForensic(target.data)), 60));
        }
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

  const quickThumbs = useMemo(() => {
    const targetDataUrl = target ? imageDataToDataURL(target.data) : null;
    const items = uploadedImages.map((item) => ({
      key: `upload-${item.id}`,
      title: item.name,
      url: item.dataUrl,
      onClick: () => selectStoredImage(item, "target"),
      active: !!targetDataUrl && targetDataUrl === item.dataUrl,
      deletable: true,
      deleteAction: () => removeUploadedImage(item.id),
    }));

    return items.slice(0, 12);
  }, [target, uploadedImages, removeUploadedImage, selectStoredImage]);

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
        <div className="app-container flex h-[58px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line2 bg-panel/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <svg width="22" height="22" viewBox="0 0 34 34" className="shrink-0" aria-label="HistoVision logo">
                <rect width="34" height="34" rx="8" fill="#111a29" stroke="#2e405f" />
                <rect x="7" y="17" width="4.5" height="10" rx="1.2" fill="#2ad4c2" className="animate-bar-grow" style={{ animationDelay: "0.05s" }} />
                <rect x="14.5" y="8" width="4.5" height="19" rx="1.2" fill="#ffb224" className="animate-bar-grow" style={{ animationDelay: "0.18s" }} />
                <rect x="22" y="12.5" width="4.5" height="14.5" rx="1.2" fill="#f45b8b" className="animate-bar-grow" style={{ animationDelay: "0.31s" }} />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-display text-[18px] font-bold tracking-tight text-ink">HistoVision</span>
                <span className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-faint">
              
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================= CORPS =========================== */}
          <div className="app-container flex w-full flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
        {/* -------- sidebar banque d'images -------- */}
          <Sidebar target={target} palette={palette} fileTargetRef={fileTargetRef} filePaletteRef={filePaletteRef} />

        {/* -------- colonne principale -------- */}
        <main className="min-w-0 flex-1">
          {/* bande de visuels rapides : démos + images chargées */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {quickThumbs.map((item) => (
              <div key={item.key} className="relative shrink-0">
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`group block overflow-hidden rounded-lg border transition-all ${item.active ? "border-amber ring-2 ring-amber/30" : "border-line hover:border-line2"}`}
                  title={item.title}
                >
                  <img src={item.url} alt={item.title} className="h-14 w-20 object-cover" loading="lazy" />
                </button>
                {item.deletable && item.deleteAction && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.deleteAction?.();
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-bg1 text-[10px] text-faint transition hover:text-rose"
                    aria-label={`Supprimer ${item.title}`}
                    title={`Supprimer ${item.title}`}
                  >
                    ×
                  </button>
                )}
              </div>
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
              presets={PALETTE_PRESETS}
              params={trParams}
              onParams={setTrParams}
              res={trRes}
              view={trView}
              onView={setTrView}
              onExport={exportImage}
              onPaletteImport={() => filePaletteRef.current?.click()}
              onPalettePreset={applyPresetPalette}
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
        <div className="app-container flex h-10 items-center gap-3 px-4 font-mono text-[10.5px] text-faint sm:px-6">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse-dot bg-amber" : "bg-teal"}`} />
            <span className={busy ? "text-amber" : "text-sub"}>{busy ?? "Prêt"}</span>
          </span>

          <span className="hidden sm:inline text-sub">
            {target ? `${target.data.width}×${target.data.height} px · ${((target.data.width * target.data.height) / 1e6).toFixed(2)} Mpx` : "aucune image"}
          </span>

          {lastOp && (
            <span className="tabular hidden text-teal md:inline">
              {lastOp.op} · {lastOp.ms.toFixed(0)} ms
            </span>
          )}
        </div>
      </footer>

      {/* inputs cachés */}
      <input ref={fileTargetRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "target")} />
      <input ref={filePaletteRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], "palette")} />
    </div>
  );
}

