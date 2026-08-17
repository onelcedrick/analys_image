import React from 'react';

export const Btn = ({ children, variant = 'default', className = '', onClick, disabled }) => {
  const base = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] font-semibold transition-all hover:shadow-lg';
  const variants = {
    default: 'bg-panel border border-line hover:border-teal/50 hover:text-teal text-text',
    teal: 'bg-teal/10 border border-teal/30 text-teal hover:bg-teal/20 hover:shadow-teal/20',
    amber: 'bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 hover:shadow-amber/20'
  };
  return (
    <button className={`${base} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-line bg-panel/70 p-4 backdrop-blur-sm card-hover ${className}`}>{children}</div>
);

export const Chip = ({ children, tone = '' }) => (
  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
    {children}
  </span>
);

export const Slider = ({ value, onChange, min = 0, max = 100, label }) => (
  <div className="space-y-2">
    {label && <div className="flex justify-between items-center"><span className="font-mono text-[10px] text-faint uppercase tracking-wider">{label}</span><span className="font-mono text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded">{value}</span></div>}
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-teal h-1.5 bg-line rounded-lg appearance-none cursor-pointer slider-thumb" />
  </div>
);

export const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-teal/60' : 'bg-line'} shadow-inner`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transform transition-all duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    {label && <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider group-hover:text-text transition-colors">{label}</span>}
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="hidden" />
  </label>
);

export const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-line bg-panel p-1 shadow-inner">
    {options.map(opt => (
      <button key={opt.value} onClick={() => onChange(opt.value)} className={`px-3 py-1.5 font-mono text-[9px] font-semibold rounded-md transition-all ${value === opt.value ? 'bg-teal/20 text-teal shadow-sm' : 'text-faint hover:text-text hover:bg-panel2'}`}>{opt.label}</button>
    ))}
  </div>
);

export const Stat = ({ label, value, unit = '' }) => (
  <div className="text-center p-3 rounded-lg bg-panel2/50 border border-line hover:border-teal/30 transition-colors">
    <div className="font-display text-xl font-bold text-teal">{value}<span className="text-sm ml-0.5">{unit}</span></div>
    <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-faint mt-1">{label}</div>
  </div>
);

export const SectionHead = ({ number, title, icon }) => (
  <div className="mb-4 flex items-center gap-3 pb-3 border-b border-line">
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-teal bg-teal/10 px-2 py-1 rounded">{number}</span>
    <div className="text-teal/80">{icon}</div>
    <h3 className="font-display text-base font-semibold text-text">{title}</h3>
  </div>
);

// Icons with improved styling
export const IconWave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal"><path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0 4 6 6 0"/></svg>;
export const IconDrop = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>;
export const IconLayers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-bluec"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
export const IconScan = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>;
export const IconFile = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
export const IconServer = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>;
export const IconUpload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
export const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
export const IconPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-teal"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
export const IconReset = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
export const IconZap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
