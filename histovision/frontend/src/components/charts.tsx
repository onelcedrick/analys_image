import { useEffect, useMemo, useRef, useState } from "react";
import { clampi, jointColor } from "../lib/imaging";
import type { ChannelLUTs } from "../lib/processing";

/* ------------------- F1 : histogramme RVB interactif ---------------- */

const VW = 640;
const VH = 248;
const PL = 38;
const PR = 10;
const PT = 12;
const PB = 22;
const PW = VW - PL - PR;
const PH = VH - PT - PB;

type ChKey = "r" | "g" | "b" | "lum";
const CH_META: { id: ChKey; label: string; color: string }[] = [
  { id: "r", label: "R", color: "#ff6b6b" },
  { id: "g", label: "G", color: "#46e08d" },
  { id: "b", label: "B", color: "#5ca9ff" },
  { id: "lum", label: "Lum", color: "#cbd5e1" },
];

export function ChannelHistogram({ data }: { data: ImageData | null }) {
  const [domain, setDomain] = useState<[number, number]>([0, 256]);
  const [log, setLog] = useState(false);
  const [vis, setVis] = useState<Record<ChKey, boolean>>({ r: true, g: true, b: true, lum: true });
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animKey = useRef(0);

  const hists = useMemo(() => {
    if (!data) return null;
    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const lum = new Uint32Array(256);
    const p = data.data;
    const n = data.width * data.height;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      r[p[j]]++;
      g[p[j + 1]]++;
      b[p[j + 2]]++;
      lum[Math.round(0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2])]++;
    }
    animKey.current++;
    return { r, g, b, lum };
  }, [data]);

  const [d0, d1] = domain;
  const zoomed = d0 > 0.5 || d1 < 255.5;

  const maxVisible = useMemo(() => {
    if (!hists) return 1;
    let m = 1;
    const i0 = Math.max(0, Math.floor(d0));
    const i1 = Math.min(255, Math.ceil(d1));
    for (const ch of CH_META) {
      if (!vis[ch.id]) continue;
      const h = hists[ch.id];
      for (let i = i0; i <= i1; i++) if (h[i] > m) m = h[i];
    }
    return m;
  }, [hists, vis, d0, d1]);

  const xFor = (bin: number) => PL + ((bin - d0) / (d1 - d0)) * PW;
  const yFor = (v: number) => {
    const t = log ? Math.log1p(v) / Math.log1p(maxVisible) : v / maxVisible;
    return PT + PH - t * PH;
  };

  const pathFor = (h: Uint32Array) => {
    const i0 = Math.max(0, Math.floor(d0));
    const i1 = Math.min(255, Math.ceil(d1));
    let dPath = "";
    for (let i = i0; i <= i1; i++) {
      const x = xFor(i).toFixed(1);
      const y = yFor(h[i]).toFixed(1);
      dPath += (i === i0 ? "M" : "L") + x + " " + y;
    }
    return dPath;
  };

  const svgX = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * VW;
  };
  const binAt = (clientX: number) => {
    const sx = svgX(clientX);
    return d0 + ((sx - PL) / PW) * (d1 - d0);
  };

  const ticks = useMemo(() => {
    const list: number[] = [];
    const step = (d1 - d0) / 6;
    for (let i = 0; i <= 6; i++) list.push(Math.round(d0 + step * i));
    return list;
  }, [d0, d1]);

  if (!data || !hists) {
    return <div className="flex h-[248px] items-center justify-center text-[13px] text-faint">Chargez une image…</div>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {CH_META.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setVis((v) => ({ ...v, [ch.id]: !v[ch.id] }))}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition-all ${
              vis[ch.id] ? "border-line2 bg-panel2 text-ink" : "border-line bg-transparent text-faint opacity-60"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: ch.color, opacity: vis[ch.id] ? 1 : 0.35 }} />
            {ch.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <button
          type="button"
          onClick={() => setLog((l) => !l)}
          className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${
            log ? "border-amber/50 bg-amber/10 text-amber" : "border-line text-faint hover:text-sub"
          }`}
        >
          log
        </button>
        {zoomed && (
          <button
            type="button"
            onClick={() => setDomain([0, 256])}
            className="rounded-md border border-teal/50 bg-teal/10 px-2 py-1 font-mono text-[11px] text-teal transition-colors hover:bg-teal/20"
          >
            réinitialiser le zoom
          </button>
        )}
        <span className="ml-auto hidden font-mono text-[10.5px] text-faint sm:block">
          glisser = zoom · double-clic = reset
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full cursor-crosshair select-none rounded-lg bg-bg1/70"
          onPointerMove={(e) => {
            if (drag) {
              setDrag({ a: drag.a, b: clampi(binAt(e.clientX), 0, 256) });
            } else {
              setHover(clampi(Math.round(binAt(e.clientX)), 0, 255));
            }
          }}
          onPointerLeave={() => {
            setHover(null);
            setDrag(null);
          }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setDrag({ a: clampi(binAt(e.clientX), 0, 256), b: clampi(binAt(e.clientX), 0, 256) });
          }}
          onPointerUp={() => {
            if (drag) {
              const a = Math.min(drag.a, drag.b);
              const b = Math.max(drag.a, drag.b);
              if ((b - a) / PW > 0.012 * (VW / PW) && xFor(b) - xFor(a) > 8) {
                setDomain([Math.max(0, a), Math.min(256, b)]);
              }
              setDrag(null);
            }
          }}
          onDoubleClick={() => setDomain([0, 256])}
        >
          {/* grille */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={PL} x2={VW - PR} y1={PT + PH * t} y2={PT + PH * t} stroke="#22304a" strokeWidth="1" strokeDasharray="2 5" />
          ))}
          <line x1={PL} x2={VW - PR} y1={PT + PH} y2={PT + PH} stroke="#2e405f" strokeWidth="1" />
          {ticks.map((t, i) => (
            <text key={i} x={xFor(clampi(t, d0, d1))} y={VH - 7} textAnchor="middle" fontSize="9.5" fill="#5c7189" fontFamily="IBM Plex Mono, monospace">
              {t}
            </text>
          ))}
          <text x={PL - 6} y={PT + 4} textAnchor="end" fontSize="9.5" fill="#5c7189" fontFamily="IBM Plex Mono, monospace">
            {log ? "ln" : ""} {maxVisible >= 1000 ? (maxVisible / 1000).toFixed(0) + "k" : maxVisible}
          </text>
          <text x={PL - 6} y={PT + PH} textAnchor="end" fontSize="9.5" fill="#5c7189" fontFamily="IBM Plex Mono, monospace">
            0
          </text>

          <g key={animKey.current} className="animate-fade-up">
            {/* aire luminance */}
            {vis.lum && (
              <path
                d={`${pathFor(hists.lum)} L${xFor(Math.min(255, Math.ceil(d1))).toFixed(1)} ${PT + PH} L${xFor(Math.max(0, Math.floor(d0))).toFixed(1)} ${PT + PH} Z`}
                fill="rgba(203,213,225,0.10)"
                stroke="none"
              />
            )}
            {CH_META.filter((c) => vis[c.id]).map((ch) => (
              <path
                key={ch.id}
                d={pathFor(hists[ch.id])}
                fill="none"
                stroke={ch.color}
                strokeWidth={ch.id === "lum" ? 1.2 : 1.5}
                strokeLinejoin="round"
                opacity={ch.id === "lum" ? 0.75 : 0.95}
                className="animate-dash"
              />
            ))}
          </g>

          {/* survol */}
          {hover !== null && hover >= d0 && hover <= d1 && (
            <g pointerEvents="none">
              <line x1={xFor(hover)} x2={xFor(hover)} y1={PT} y2={PT + PH} stroke="#ffb224" strokeWidth="1" opacity="0.8" />
              {CH_META.filter((c) => vis[c.id]).map((ch) => (
                <circle key={ch.id} cx={xFor(hover)} cy={yFor(hists[ch.id][hover])} r="3" fill={ch.color} stroke="#0d1421" strokeWidth="1.2" />
              ))}
            </g>
          )}

          {/* sélection de zoom */}
          {drag && Math.abs(xFor(drag.b) - xFor(drag.a)) > 3 && (
            <rect
              x={Math.min(xFor(drag.a), xFor(drag.b))}
              y={PT}
              width={Math.abs(xFor(drag.b) - xFor(drag.a))}
              height={PH}
              fill="rgba(255,178,36,0.10)"
              stroke="rgba(255,178,36,0.55)"
              strokeWidth="1"
            />
          )}
        </svg>

        {hover !== null && hover >= d0 && hover <= d1 && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line2 bg-bg0/95 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed shadow-xl"
            style={{ left: `${(xFor(hover) / VW) * 100}%` }}
          >
            <div className="mb-0.5 font-semibold text-amber">niv. {hover}</div>
            {CH_META.filter((c) => vis[c.id]).map((ch) => (
              <div key={ch.id} className="flex items-center gap-1.5 text-sub">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ch.color }} />
                {ch.label.padEnd(3)} <span className="tabular text-ink">{hists[ch.id][hover].toLocaleString("fr-FR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------- F2 : courbes de transfert -------------------- */

export function TransferCurves({ luts }: { luts: ChannelLUTs | null }) {
  const chans = [
    { id: "L" as const, label: "L*", color: "#cbd5e1", min: 0, max: 100 },
    { id: "a" as const, label: "a*", color: "#ff6b6b", min: -128, max: 127 },
    { id: "b" as const, label: "b*", color: "#ffd24a", min: -128, max: 127 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {chans.map((ch) => {
        const lut = luts ? luts[ch.id] : null;
        const W = 120;
        const H = 92;
        const P = 9;
        let d = "";
        if (lut) {
          for (let i = 0; i < 256; i++) {
            const x = P + (i / 255) * (W - 2 * P);
            const y = H - P - ((lut[i] - ch.min) / (ch.max - ch.min)) * (H - 2 * P);
            d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
          }
        }
        return (
          <div key={ch.id} className="rounded-lg border border-line bg-bg1/70 p-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-semibold" style={{ color: ch.color }}>
                {ch.label}
              </span>
              <span className="font-mono text-[9px] text-faint">
                {ch.min}…{ch.max}
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
              <line x1={P} y1={H - P} x2={W - P} y2={P} stroke="#2e405f" strokeWidth="1" strokeDasharray="3 4" />
              {lut && <path d={d} fill="none" stroke={ch.color} strokeWidth="1.7" strokeLinejoin="round" />}
              <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#22304a" strokeWidth="1" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------- F4 : histogramme conjoint 2D ------------------- */

export function JointHistogramCanvas({ matrix, otsuYBin }: { matrix: Float32Array | null; otsuYBin: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const S = 320;
    c.width = S;
    c.height = S;
    ctx.fillStyle = "#0b1420";
    ctx.fillRect(0, 0, S, S);
    if (matrix) {
      const cell = S / 32;
      for (let gy = 0; gy < 32; gy++) {
        for (let gx = 0; gx < 32; gx++) {
          const v = matrix[gy * 32 + gx];
          if (v <= 0.004) continue;
          const [r, g, b] = jointColor(v);
          ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
          ctx.fillRect(gx * cell, (31 - gy) * cell, cell + 0.5, cell + 0.5);
        }
      }
      // seuil d'Otsu (axe gradient)
      const y = (31 - otsuYBin) * cell + cell / 2;
      ctx.strokeStyle = "rgba(255,178,36,0.95)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffb224";
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillText("seuil Otsu", 6, y - 5);
    }
  }, [matrix, otsuYBin]);
  return (
    <div>
      <canvas ref={ref} className="w-full rounded-lg" style={{ imageRendering: "pixelated" }} />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
        <span>↑ gradient (Sobel)</span>
        <span>intensité →</span>
      </div>
    </div>
  );
}

/* ----------------- F5 : histogramme des coefficients ---------------- */

export function CoeffHistogram({ hist }: { hist: Float32Array | null }) {
  if (!hist) return <div className="flex h-[120px] items-center justify-center text-[12px] text-faint">Lancez l'analyse…</div>;
  let max = 0.0001;
  for (let i = 0; i < hist.length; i++) if (hist[i] > max) max = hist[i];
  const W = 320;
  const H = 110;
  const P = 6;
  const bw = (W - 2 * P) / hist.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
      {Array.from(hist).map((v, i) => {
        const h = (v / max) * (H - 16);
        const zero = i === 20;
        return (
          <rect
            key={i}
            x={P + i * bw + 0.6}
            y={H - h}
            width={bw - 1.2}
            height={Math.max(1, h)}
            rx="1"
            fill={zero ? "#ffb224" : "#2ad4c2"}
            opacity={zero ? 1 : 0.66}
          />
        );
      })}
      <line x1={P} y1={H} x2={W - P} y2={H} stroke="#2e405f" strokeWidth="1" />
      {[-20, 0, 20].map((t, k) => (
        <text
          key={t}
          x={P + ((t + 20) / 40) * (W - 2 * P)}
          y={H + 12}
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
          fontSize="9.5"
          fill={t === 0 ? "#ffb224" : "#5c7189"}
          fontFamily="IBM Plex Mono, monospace"
        >
          {t > 0 ? `+${t}` : t}
        </text>
      ))}
    </svg>
  );
}

/* ------------------- sparkline header (lum live) -------------------- */

export function MiniHist({ hist }: { hist: Uint32Array | null }) {
  if (!hist) return null;
  let max = 1;
  for (let i = 0; i < 256; i++) if (hist[i] > max) max = hist[i];
  const W = 132;
  const H = 26;
  let d = `M0 ${H}`;
  for (let i = 0; i < 256; i += 2) {
    const x = (i / 255) * W;
    const y = H - (Math.log1p(hist[i]) / Math.log1p(max)) * (H - 2);
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[26px] w-[132px]">
      <path d={d} fill="rgba(255,178,36,0.35)" stroke="rgba(255,178,36,0.9)" strokeWidth="1" />
    </svg>
  );
}