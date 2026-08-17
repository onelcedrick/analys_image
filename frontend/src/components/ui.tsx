import React from 'react';

// Icônes SVG
export const IconWave = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M2 12c3-6 5-6 8 0s5 6 8 0 5-6 8 0"/>
  </svg>
);
export const IconDrop = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M12 2L7 9c-3 4-3 9 2 12 4 2 9-1 10-6 1-4-2-8-7-13z"/>
  </svg>
);
export const IconLayers = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
export const IconScan = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/>
  </svg>
);
export const IconFile = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
export const IconServer = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/>
  </svg>
);
export const IconUpload = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
export const IconDownload = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
export const IconPlay = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
export const IconReset = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
  </svg>
);
export const IconZap = (props: any) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

// Composants UI
export const Btn = ({ variant = 'default', className = '', children, ...props }: any) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1421]';
  const variants: Record<string, string> = {
    teal: 'bg-[#2ad4c2] text-[#0d1421] hover:bg-[#2ad4c2]/90 focus:ring-[#2ad4c2]',
    amber: 'bg-[#ffb224] text-[#0d1421] hover:bg-[#ffb224]/90 focus:ring-[#ffb224]',
    rose: 'bg-[#f45b8b] text-white hover:bg-[#f45b8b]/90 focus:ring-[#f45b8b]',
    outline: 'border border-[#2e405f] bg-transparent text-[#e6eef8] hover:bg-[#152033] focus:ring-[#2e405f]',
    ghost: 'text-[#9fb3c8] hover:text-[#e6eef8] hover:bg-[#152033]',
    default: 'bg-[#152033] text-[#e6eef8] hover:bg-[#1a2840] border border-[#2e405f]',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>
  );
};

export const Card = ({ className = '', children, ...props }: any) => (
  <div className={`rounded-xl border border-[#2e405f] bg-[#152033]/70 backdrop-blur-sm ${className}`} {...props}>{children}</div>
);

export const Chip = ({ tone = '', className = '', children, ...props }: any) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone} ${className}`} {...props}>{children}</span>
);

export const Slider = ({ value, onChange, min = 0, max = 100, step = 1, label, suffix = '' }: any) => (
  <div className="space-y-1.5">
    {label && <div className="flex justify-between text-xs"><span className="text-[#9fb3c8]">{label}</span><span className="font-mono text-[#2ad4c2]">{value}{suffix}</span></div>}
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
  </div>
);

export const Toggle = ({ checked, onChange, label }: any) => (
  <label className="flex items-center justify-between cursor-pointer">
    <span className="text-sm text-[#9fb3c8]">{label}</span>
    <div className="relative">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#2ad4c2]' : 'bg-[#2e405f]'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </div>
  </label>
);

export const Segmented = ({ options, value, onChange }: any) => (
  <div className="inline-flex rounded-lg border border-[#2e405f] bg-[#152033] p-0.5">
    {options.map((opt: any) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1 text-xs rounded-md transition-all ${value === opt.value ? 'bg-[#2ad4c2] text-[#0d1421]' : 'text-[#9fb3c8] hover:text-[#e6eef8]'}`}
      >{opt.label}</button>
    ))}
  </div>
);

export const Stat = ({ label, value, suffix = '', tone = 'text-[#e6eef8]' }: any) => (
  <div className="text-center">
    <div className={`text-lg font-bold ${tone}`}>{value}<span className="text-sm font-normal text-[#6b7f99] ml-0.5">{suffix}</span></div>
    <div className="text-[10px] uppercase tracking-wider text-[#6b7f99]">{label}</div>
  </div>
);

export const SectionHead = ({ n, label, icon, right }: any) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] font-bold text-[#2ad4c2] bg-[#2ad4c2]/10 px-1.5 py-0.5 rounded">{n}</span>
      {icon}<span className="font-display text-base font-semibold">{label}</span>
    </div>
    {right && <div className="ml-auto">{right}</div>}
  </div>
);

export const BusyBar = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-full border border-[#2e405f] bg-[#152033]/95 backdrop-blur px-4 py-2.5 shadow-lg">
        <div className="w-4 h-4 border-2 border-[#2ad4c2] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#9fb3c8]">{message}</span>
      </div>
    </div>
  );
};
