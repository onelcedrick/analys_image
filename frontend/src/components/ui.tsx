import type { CSSProperties, ReactNode } from "react";
import React, { useState } from "react";

/* ------------------------------ icônes ---------------------------- */

function Svg({ children, size = 15 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconUpload = () => (
  <Svg>
    <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Svg>
);
export const IconDownload = () => (
  <Svg>
    <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
  </Svg>
);
export const IconPlay = () => (
  <Svg>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconReset = () => (
  <Svg>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Svg>
);
export const IconCheck = () => (
  <Svg>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);
export const IconFile = () => (
  <Svg>
    <path d="M6 2h8l4 4v16H6V2Z" />
    <path d="M14 2v4h4M9 12h6M9 16h6" />
  </Svg>
);
export const IconDrop = () => (
  <Svg>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
  </Svg>
);
export const IconScan = () => (
  <Svg>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <path d="M4 12h16" />
  </Svg>
);
export const IconLayers = () => (
  <Svg>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);
export const IconWave = () => (
  <Svg>
    <path d="M2 12h3l2-7 4 14 3-10 2 5 2-2h4" />
  </Svg>
);
export const IconZap = () => (
  <Svg>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </Svg>
);
export const IconEye = () => (
  <Svg>
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);
export const IconServer = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="7" rx="1.5" />
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <path d="M7 7.5h.01M7 16.5h.01M11 7.5h2M11 16.5h2" />
  </Svg>
);

/* --------------------------- primitives --------------------------- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-line bg-panel/90 shadow-[0_10px_30px_-12px_rgba(2,6,23,0.6)] ${className}`}
      style={{ overflow: "hidden" }}
    >
      {children}
    </section>
  );
}

export function SectionHead(props: any) {
  if (props && Object.prototype.hasOwnProperty.call(props, 'n')) {
    const { n, label, icon, right } = props;
    return (
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-amber">{n}</span>
          <h2 className="font-display text-lg font-bold tracking-tight text-ink flex items-center gap-2">{icon && <span className="mr-1">{icon}</span>}{label}</h2>
        </div>
        {right && <div>{right}</div>}
      </div>
    );
  }

  const { k, title, desc } = props;
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-amber">{k}</span>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
      </div>
      {desc && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-sub">{desc}</p>}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  color = "var(--color-teal)",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-sub">{label}</span>
        <span className="tabular font-mono text-[12px] font-semibold text-ink">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          <span className="ml-0.5 text-faint">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": `${pct}%`, "--range-color": color } as CSSProperties}
      />
    </label>
  );
}

// ========== TOGGLE corrigé ==========
export function Toggle({
  label,
  checked,
  defaultChecked = false,
  onChange,
  hint,
}: {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  hint?: string;
}) {
  // Si `checked` est fourni → mode contrôlé, sinon on gère l'état interne
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const currentChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    const newValue = !currentChecked;
    if (!isControlled) setInternalChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentChecked}
      onClick={handleToggle}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel2/60 px-3 py-2.5 text-left transition-colors hover:border-line2"
    >
      <span>
        <span className="block text-[12px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-faint">{hint}</span>}
      </span>
      <span
        className={`relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors duration-200 ${
          currentChecked ? "bg-teal/90" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-ink shadow transition-all duration-200 ${
            currentChecked ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "teal" | "rose";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-150 active:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none";
  const styles = {
    primary: "bg-amber text-[#1a1204] hover:bg-[#ffc14d] shadow-[0_6px_20px_-8px_rgba(255,178,36,0.6)]",
    teal: "bg-teal/15 text-teal ring-1 ring-teal/40 hover:bg-teal/25",
    rose: "bg-rose/15 text-rose ring-1 ring-rose/40 hover:bg-rose/25",
    ghost: "border border-line bg-panel2/60 text-sub hover:text-ink hover:border-line2",
  }[variant as string];
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "text-ink",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-line2">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-faint">{label}</div>
      <div className={`tabular mt-1 font-display text-[22px] font-bold leading-none ${tone}`}>{value}</div>
      {sub && <div className="tabular mt-1 font-mono text-[10.5px] text-faint">{sub}</div>}
    </div>
  );
}

export function Chip({ children, tone = "text-sub border-line" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium ${tone}`}>
      {children}
    </span>
  );
}

export function BusyBar({ label }: { label: string | null }) {
  return (
    <div className="relative h-[3px] overflow-hidden rounded-full bg-line/40">
      {label && <div className="animate-shimmer absolute inset-0" />}
    </div>
  );
}

/* ---------------------- Backwards-compatible aliases --------------------- */

export const Button = ({ children, onClick, className = '' }: any) => (
  <Btn onClick={onClick} className={className}>{children}</Btn>
);

export const SectionTitle = ({ children, className = '' }: any) => (
  <h3 className={`text-lg font-semibold text-ink mb-4 ${className}`}>{children}</h3>
);

export const StatCard = ({ label, value, color = 'text-ink' }: any) => (
  <Stat label={label} value={typeof value === 'number' ? value : 0} />
);

// ========== SEGMENTEDCONTROL corrigé ==========
export function SegmentedControl({
  options,
  value,
  onChange,
  defaultValue,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || '');
  const currentValue = isControlled ? value : internalValue;

  const handleClick = (val: string) => {
    if (isControlled) {
      onChange?.(val);
    } else {
      setInternalValue(val);
      onChange?.(val);
    }
  };

  return (
    <div className="inline-flex rounded-lg border border-line bg-bg1 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value)}
          className={`rounded-md font-medium transition-all duration-150 px-3 py-1.5 text-[12px] ${
            currentValue === opt.value
              ? 'bg-panel2 text-ink shadow ring-1 ring-line2'
              : 'text-sub hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}