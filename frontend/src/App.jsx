import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DEMOS, KIND_META } from './data/demos.js';
import { downloadPNG, loadImage, toImageData, imageToLab } from './lib/imaging.js';
import { renderHeatCanvas, runForensic, runTexture, runTransfer } from './lib/processing.js';
import { serverForensic, serverTexture, serverTransfer } from './lib/serverBridge.js';
import { useServerStatus } from './hooks/useServerStatus.js';
import {
  Btn, Card, Chip, Segmented, Slider, Toggle, Stat, SectionHead,
  IconDownload, IconDrop, IconFile, IconLayers, IconPlay, IconReset,
  IconScan, IconServer, IconUpload, IconWave, IconZap
} from './components/ui.jsx';
import { ChannelHistogram, MiniHist } from './components/charts.jsx';

const TABS = [
  { id: "signal", n: "01", label: "Signal", icon: <IconWave /> },
  { id: "transfert", n: "02", label: "Transfert Lab", icon: <IconDrop /> },
  { id: "texture", n: "03", label: "Texture", icon: <IconLayers /> },
  { id: "forensic", n: "04", label: "Forensic DCT", icon: <IconScan /> },
  { id: "docs", n: "05", label: "Cahier des charges", icon: <IconFile /> },
  { id: "backend", n: "06", label: "Backend", icon: <IconServer /> }
];

const fmtInt = (n) => n.toLocaleString("fr-FR");

export default function App() {
  const [target, setTarget] = useState(null);
  const [palette, setPalette] = useState(null);
  const [tab, setTab] = useState("signal");
  const [loadError, setLoadError] = useState(false);
  const { serverUp, checking } = useServerStatus();
  const [mode, setMode] = useState("client");
  const useServer = mode === "server" && serverUp;
  const [trParams, setTrParams] = useState({ strength: 85, skinProtect: true, feather: 14 });
  const [trRes, setTrRes] = useState(null);
  const [trView, setTrView] = useState("result");
  const [txParams, setTxParams] = useState({ clip: 2.6, smooth: 26, blend: 85 });
  const [txRes, setTxRes] = useState(null);
  const [txView, setTxView] = useState("result");
  const [fxRes, setFxRes] = useState(null);
  const [fxOpacity, setFxOpacity] = useState(72);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastOp, setLastOp] = useState(null);
  const fileTargetRef = useRef(null);
  const filePaletteRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBusy("Chargement du jeu de démonstration…");
        const [imgT, imgP] = await Promise.all([
          loadImage(DEMOS[0].url),
          loadImage(DEMOS[1].url)
        ]);
        if (!alive) return;
        setTarget({ name: DEMOS[0].label, data: toImageData(imgT, 1000) });
        setPalette({ name: DEMOS[1].label, data: toImageData(imgP, 700) });
      } catch {
        if (alive) setLoadError(true);
      } finally {
        if (alive) setBusy(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  const targetLab = useMemo(() => target ? imageToLab(target.data) : null, [target]);
  const paletteLab = useMemo(() => palette ? imageToLab(palette.data) : null, [palette]);

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

  const stats = useMemo(() => {
    if (!target) return null;
    const h = lumHist;
    const n = target.data.width * target.data.height;
    let sum = 0, sum2 = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * h[i];
      sum2 += i * i * h[i];
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    let ent = 0, clipped = 0, acc = 0, p1 = 0, p99 = 255, found1 = false;
    for (let i = 0; i < 256; i++) {
      const pr = h[i] / n;
      if (pr > 0) ent -= pr * Math.log2(pr);
      if (i < 8 || i > 247) clipped += h[i];
      acc += h[i];
      if (!found1 && acc >= n * 0.01) { p1 = i; found1 = true; }
      if (acc <= n * 0.99) p99 = i;
    }
    return { mean, std, ent, clipped: clipped / n * 100, p1, p99 };
  }, [target, lumHist]);

  // Transfer effect
  useEffect(() => {
    if (!target || !palette) return;
    let active = true;
    setBusy(useServer ? "Transfert sur le serveur…" : "Transport optimal en CIE Lab…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const params = { strength: trParams.strength / 100, skinProtect: trParams.skinProtect, feather: trParams.feather };
        const res = useServer 
          ? await serverTransfer(target.data, palette.data, params)
          : await new Promise(resolve => setTimeout(() => resolve(runTransfer(target.data, targetLab, paletteLab, params)), 130));
        if (!active) return;
        setTrRes(res);
        setLastOp({ op: useServer ? "OT Lab · serveur" : "OT Lab · navigateur", ms: performance.now() - t0 });
      } catch (e) {
        if (active) setToast(`Transfert échec — ${e.message}`);
      } finally {
        if (active) setBusy(null);
      }
    };
    run();
    return () => { active = false; setBusy(null); };
  }, [target, palette, targetLab, paletteLab, trParams, useServer]);

  // Texture effect
  useEffect(() => {
    if (!target) return;
    let active = true;
    setBusy(useServer ? "Texture sur le serveur…" : "Histogramme conjoint + CLAHE…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const params = { clip: txParams.clip, smooth: txParams.smooth, blend: txParams.blend / 100 };
        const res = useServer
          ? await serverTexture(target.data, params)
          : await new Promise(resolve => setTimeout(() => resolve(runTexture(target.data, params)), 160));
        if (!active) return;
        setTxRes(res);
        setLastOp({ op: useServer ? "Texture · serveur" : "Texture · navigateur", ms: performance.now() - t0 });
      } catch (e) {
        if (active) setToast(`Texture échec — ${e.message}`);
      } finally {
        if (active) setBusy(null);
      }
    };
    run();
    return () => { active = false; setBusy(null); };
  }, [target, txParams, useServer]);

  useEffect(() => { setFxRes(null); setTrRes(null); setTxRes(null); }, [target]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const loadFile = useCallback((file, as) => {
    const url = URL.createObjectURL(file);
    loadImage(url).then(img => {
      const data = toImageData(img, as === "target" ? 1000 : 700);
      if (as === "target") setTarget({ name: file.name, data });
      else setPalette({ name: file.name, data });
      setToast(`${as === "target" ? "Cible" : "Palette"} chargée — ${file.name}`);
    }).catch(() => setToast("Fichier illisible"));
  }, []);

  const runForensicNow = () => {
    if (!target || busy) return;
    setBusy(useServer ? "DCT 8×8 sur le serveur…" : "DCT 8×8 — analyse forensique…");
    const run = async () => {
      const t0 = performance.now();
      try {
        const res = useServer
          ? await serverForensic(target.data)
          : await new Promise(resolve => setTimeout(() => resolve(runForensic(target.data)), 60));
        setFxRes(res);
        setLastOp({ op: useServer ? "Forensic DCT · serveur" : "Forensic DCT · navigateur", ms: performance.now() - t0 });
      } catch (e) {
        setToast(`Forensic échec — ${e.message}`);
      } finally {
        setBusy(null);
      }
    };
    run();
  };

  const exportImage = (data, name) => {
    if (!data) return;
    downloadPNG(data, name);
    setToast(`PNG exporté — ${name}`);
  };

  const exportHeatmap = () => {
    if (!target || !fxRes) return;
    const c = document.createElement("canvas");
    c.width = target.data.width;
    c.height = target.data.height;
    const ctx = c.getContext("2d");
    ctx.putImageData(target.data, 0, 0);
    ctx.globalAlpha = fxOpacity / 100;
    ctx.drawImage(renderHeatCanvas(fxRes), 0, 0, c.width, c.height);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "histovision-heatmap-dct.png";
    a.click();
    setToast("Heatmap DCT exportée");
  };

  const trAfter = trView === "result" ? trRes?.result ?? null : trRes?.maskVis ?? null;
  const txAfter = txView === "result" ? txRes?.result ?? null : txRes?.gradVis ?? null;

  const loadDemo = (d, as) => {
    loadImage(d.url).then(img => {
      const data = toImageData(img, as === "target" ? 1000 : 700);
      if (as === "target") setTarget({ name: d.label, data });
      else setPalette({ name: d.label, data });
      setToast(`${d.label} chargé`);
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* Background */}
      <div className="glow-field pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-grid pointer-events-none fixed inset-0 -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
              <rect width="34" height="34" rx="8" fill="#111a29" stroke="#2e405f" />
              <rect x="7" y="17" width="4.5" height="10" rx="1.2" fill="#2ad4c2" />
              <rect x="14.5" y="8" width="4.5" height="19" rx="1.2" fill="#ffb224" />
              <rect x="22" y="12.5" width="4.5" height="14.5" rx="1.2" fill="#f45b8b" />
            </svg>
            <div className="leading-none">
              <div className="flex items-center gap-2">
                <span className="font-display text-[19px] font-bold tracking-tight">HistoVision</span>
                <span className="rounded bg-amber px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-[#1a1204]">PRO</span>
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-faint">Analyse histogrammique · Transport optimal</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-lg border border-line bg-panel/70 px-2.5 py-1.5" title="Histogramme de luminance">
                <MiniHist hist={lumHist} />
              </div>
              <Chip tone="text-teal border-teal/30">CIE Lab D65</Chip>
              <Chip tone="text-amber border-amber/30">OT 1D · W₂</Chip>
              <Chip tone="text-ink border-line2 bg-panel2">v1.0</Chip>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2 py-1">
                <IconServer />
                <select value={mode} onChange={e => setMode(e.target.value)} className="bg-transparent font-mono text-[10px] text-text outline-none">
                  <option value="client">Client</option>
                  <option value="server">Serveur</option>
                </select>
                {checking && <span className="animate-pulse text-teal">●</span>}
                {!checking && serverUp && <span className="text-teal">●</span>}
                {!checking && !serverUp && <span className="text-rose">●</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-[2px] overflow-hidden bg-line/40">
          <div className="animate-scan absolute h-full w-1/3 bg-gradient-to-r from-transparent via-amber to-transparent" />
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 gap-5 px-4 py-5 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden w-[228px] shrink-0 lg:block">
          <div className="sticky top-[78px] space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Banque d'images</span>
                <span className="font-mono text-[10px] text-faint">{DEMOS.length}</span>
              </div>
              <div className="space-y-2">
                {DEMOS.map(d => {
                  const isTarget = target?.name === d.label;
                  const isPalette = palette?.name === d.label;
                  const meta = KIND_META[d.kind];
                  return (
                    <div key={d.id} className={`group flex items-center gap-2 rounded-lg border p-2 transition-colors ${isTarget || isPalette ? 'border-teal/50 bg-teal/5' : 'border-line bg-panel/40 hover:border-line2'}`}>
                      <div className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[11px] font-medium">{d.label}</div>
                        <div className="truncate text-[9px] text-faint">{meta.label}</div>
                      </div>
                      <button onClick={() => loadDemo(d, 'target')} className={`rounded px-1.5 py-1 text-[8px] font-semibold ${isTarget ? 'bg-teal text-bg0' : 'bg-line text-faint hover:text-text'}`}>Cible</button>
                      <button onClick={() => loadDemo(d, 'palette')} className={`rounded px-1.5 py-1 text-[8px] font-semibold ${isPalette ? 'bg-rose text-bg0' : 'bg-line text-faint hover:text-text'}`}>Pal.</button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Btn variant="teal" className="w-full" onClick={() => fileTargetRef.current?.click()}>
                <IconUpload /> Importer une cible
              </Btn>
              <input ref={fileTargetRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && loadFile(e.target.files[0], 'target')} />
              <Btn variant="amber" className="w-full" onClick={() => filePaletteRef.current?.click()}>
                <IconUpload /> Importer une palette
              </Btn>
              <input ref={filePaletteRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && loadFile(e.target.files[0], 'palette')} />
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-all ${tab === t.id ? 'border-teal/50 bg-teal/10 text-teal' : 'border-line bg-panel/50 text-faint hover:border-line2 hover:text-text'}`}>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] opacity-60">{t.n}</span>
                {t.icon}
                <span className="font-mono text-[10px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <Card className="min-h-[500px]">
            {tab === "signal" && (
              <div>
                <SectionHead number="01" title="Analyse du signal" icon={<IconWave />} />
                {stats ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <Stat label="Moyenne" value={stats.mean.toFixed(1)} />
                    <Stat label="Écart-type" value={stats.std.toFixed(1)} />
                    <Stat label="Entropie" value={stats.ent.toFixed(2)} />
                    <Stat label="Clipped" value={stats.clipped.toFixed(1)} unit="%" />
                    <Stat label="Dynamique" value={`${stats.p1}-${stats.p99}`} />
                  </div>
                ) : <div className="text-faint">En attente d'image…</div>}
                <div className="mt-6">
                  <div className="mb-2 font-mono text-[10px] text-faint">Histogramme de luminance</div>
                  <ChannelHistogram hist={lumHist} />
                </div>
              </div>
            )}

            {tab === "transfert" && (
              <div>
                <SectionHead number="02" title="Transfert chromatique CIE Lab" icon={<IconDrop />} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 font-mono text-[10px] text-faint">Cible</div>
                    {target && <img src={target.data ? (() => { const c = document.createElement('canvas'); c.width = target.data.width; c.height = target.data.height; c.getContext('2d').putImageData(target.data, 0, 0); return c.toDataURL(); })() : ''} className="rounded-lg border border-line" style={{maxWidth: '100%'}} alt="target" />}
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] text-faint">Palette</div>
                    {palette && <img src={palette.data ? (() => { const c = document.createElement('canvas'); c.width = palette.data.width; c.height = palette.data.height; c.getContext('2d').putImageData(palette.data, 0, 0); return c.toDataURL(); })() : ''} className="rounded-lg border border-line" style={{maxWidth: '100%'}} alt="palette" />}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Slider value={trParams.strength} onChange={v => setTrParams({...trParams, strength: v})} min={0} max={100} label="Force" />
                  <Toggle checked={trParams.skinProtect} onChange={v => setTrParams({...trParams, skinProtect: v})} label="Protection peau" />
                  <Slider value={trParams.feather} onChange={v => setTrParams({...trParams, feather: v})} min={0} max={50} label="Feather" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Segmented options={[{value:'result',label:'Résultat'},{value:'mask',label:'Masque'}]} value={trView} onChange={setTrView} />
                  {trRes?.result && <Btn onClick={() => exportImage(trRes.result, 'transfert-result.png')}><IconDownload /> Exporter</Btn>}
                </div>
                {trAfter && (
                  <div className="mt-4">
                    <img src={(() => { const c = document.createElement('canvas'); c.width = trAfter.width; c.height = trAfter.height; c.getContext('2d').putImageData(trAfter, 0, 0); return c.toDataURL(); })()} className="rounded-lg border border-line" style={{maxWidth: '100%'}} alt="result" />
                  </div>
                )}
              </div>
            )}

            {tab === "texture" && (
              <div>
                <SectionHead number="03" title="Analyse de texture" icon={<IconLayers />} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 font-mono text-[10px] text-faint">Original</div>
                    {target && <img src={target.data ? (() => { const c = document.createElement('canvas'); c.width = target.data.width; c.height = target.data.height; c.getContext('2d').putImageData(target.data, 0, 0); return c.toDataURL(); })() : ''} className="rounded-lg border border-line" style={{maxWidth: '100%'}} alt="original" />}
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] text-faint">Traité</div>
                    {txAfter && <img src={(() => { const c = document.createElement('canvas'); c.width = txAfter.width; c.height = txAfter.height; c.getContext('2d').putImageData(txAfter, 0, 0); return c.toDataURL(); })()} className="rounded-lg border border-line" style={{maxWidth: '100%'}} alt="processed" />}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Slider value={txParams.clip} onChange={v => setTxParams({...txParams, clip: v})} min={0} max={10} label="CLAHE Clip" />
                  <Slider value={txParams.smooth} onChange={v => setTxParams({...txParams, smooth: v})} min={0} max={100} label="Lissage" />
                  <Slider value={txParams.blend} onChange={v => setTxParams({...txParams, blend: v})} min={0} max={100} label="Blend" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Segmented options={[{value:'result',label:'Résultat'},{value:'grad',label:'Gradient'}]} value={txView} onChange={setTxView} />
                  {txRes?.result && <Btn onClick={() => exportImage(txRes.result, 'texture-result.png')}><IconDownload /> Exporter</Btn>}
                </div>
              </div>
            )}

            {tab === "forensic" && (
              <div>
                <SectionHead number="04" title="Forensique DCT 8×8" icon={<IconScan />} />
                <div className="flex items-center gap-4">
                  <Btn onClick={runForensicNow}><IconPlay /> Lancer l'analyse</Btn>
                  {fxRes && <Btn onClick={exportHeatmap}><IconDownload /> Exporter heatmap</Btn>}
                </div>
                <div className="mt-4">
                  <Slider value={fxOpacity} onChange={setFxOpacity} min={0} max={100} label="Opacité heatmap" />
                </div>
                {fxRes && target && (
                  <div className="mt-4 relative">
                    <canvas ref={el => {
                      if (el && fxRes) {
                        const ctx = el.getContext('2d');
                        el.width = target.data.width;
                        el.height = target.data.height;
                        ctx.putImageData(target.data, 0, 0);
                        ctx.globalAlpha = fxOpacity / 100;
                        ctx.drawImage(renderHeatCanvas(fxRes), 0, 0);
                      }
                    }} className="rounded-lg border border-line" style={{maxWidth: '100%'}} />
                  </div>
                )}
              </div>
            )}

            {tab === "docs" && (
              <div>
                <SectionHead number="05" title="Cahier des charges" icon={<IconFile />} />
                <div className="prose prose-invert max-w-none">
                  <h3 className="font-display text-lg font-semibold">HistoVision Pro</h3>
                  <p className="text-text-dim">Dashboard d'analyse histogrammique avec transport optimal en CIE Lab, protection sémantique, analyse de texture et forensique DCT.</p>
                  <h4 className="mt-4 font-mono text-sm font-semibold text-teal">Fonctionnalités</h4>
                  <ul className="list-disc pl-5 text-text-dim">
                    <li>Analyse histogrammique (moyenne, écart-type, entropie)</li>
                    <li>Transport optimal 1D en espace CIE Lab D65</li>
                    <li>Protection des zones de peau par détection chrominance</li>
                    <li>Analyse de texture par CLAHE et gradients</li>
                    <li>Forensique DCT 8×8 pour détection de manipulations</li>
                  </ul>
                </div>
              </div>
            )}

            {tab === "backend" && (
              <div>
                <SectionHead number="06" title="Backend" icon={<IconServer />} />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${serverUp ? 'bg-teal' : 'bg-rose'}`} />
                    <span className="font-mono text-sm">{serverUp ? 'Serveur connecté' : 'Serveur hors ligne'}</span>
                  </div>
                  <div className="rounded-lg border border-line bg-panel p-4 font-mono text-[10px]">
                    <div className="text-faint">Base URL:</div>
                    <div className="text-teal">http://localhost:8000</div>
                    <div className="mt-2 text-faint">Endpoints:</div>
                    <ul className="list-disc pl-5 text-text-dim">
                      <li>POST /api/transfer</li>
                      <li>POST /api/texture</li>
                      <li>POST /api/forensic</li>
                      <li>GET /health</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Status Bar */}
          {busy && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-panel px-4 py-2 font-mono text-[10px] text-teal">
              {busy}
            </div>
          )}
          {toast && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 font-mono text-[10px] text-teal">
              {toast}
            </div>
          )}
          {lastOp && (
            <div className="fixed right-4 bottom-4 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[9px]">
              <div className="text-faint">{lastOp.op}</div>
              <div className="text-teal">{lastOp.ms.toFixed(0)} ms</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
