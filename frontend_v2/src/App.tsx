type TabId = "signal" | "transfert" | "texture" | "forensic" | "docs" | "backend";

const TABS: { id: TabId; n: string; label: string }[] = [
  { id: "signal", n: "01", label: "Signal" },
  { id: "transfert", n: "02", label: "Transfert Lab" },
  { id: "texture", n: "03", label: "Texture" },
  { id: "forensic", n: "04", label: "Forensic DCT" },
  { id: "docs", n: "05", label: "Cahier des charges" },
  { id: "backend", n: "06", label: "Backend" },
];

export default function App() {
  const [tab, setTab] = useState<TabId>("signal");

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="glow-field pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-grid pointer-events-none fixed inset-0 -z-10" />

      <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
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
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-faint">
              Analyse histogrammique · Transport optimal
            </div>
          </div>
        </div>
        <div className="relative h-[2px] overflow-hidden bg-line/40">
          <div className="animate-scan absolute h-full w-1/3 bg-gradient-to-r from-transparent via-amber to-transparent" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6">
        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-[13px] font-semibold transition-colors ${
                tab === t.id ? "text-ink" : "text-sub hover:text-ink"
              }`}
            >
              <span className={`font-mono text-[10px] font-bold ${tab === t.id ? "text-amber" : "text-faint"}`}>{t.n}</span>
              {t.label}
              <span
                className={`absolute inset-x-2 bottom-0 h-[2px] origin-left rounded-full bg-amber transition-transform duration-300 ${
                  tab === t.id ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </nav>
        <p className="font-mono text-[12px] text-faint">
          frontend opérationnel — onglet actif : <span className="text-amber">{tab}</span>
        </p>
      </main>

      <footer className="mt-auto border-t border-line bg-bg1/70">
        <div className="mx-auto flex h-10 max-w-[1500px] items-center px-4 font-mono text-[10.5px] text-faint sm:px-6">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-teal" /> pipeline idle — prêt
          <span className="ml-auto">React + Vite + Tailwind v4</span>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";