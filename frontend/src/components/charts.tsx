import React, { useRef, useEffect } from 'react';

export const MiniHist = ({ hist }: { hist: Uint32Array | null }) => {
  if (!hist) return <div className="w-24 h-8 bg-[#152033] rounded" />;
  const max = Math.max(...hist);
  return (
    <svg width="96" height="32" className="overflow-visible">
      {Array.from({ length: 256 }, (_, i) => i).map((i) => {
        const h = (hist[i] / max) * 28;
        return (
          <rect key={i} x={i * 0.375} y={32 - h} width="0.25" height={h} fill="#2ad4c2" opacity="0.8" />
        );
      })}
    </svg>
  );
};

export const ChannelHistogram = ({ data, color = '#2ad4c2', label }: { data: number[]; color?: string; label?: string }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="relative">
      <svg width="100%" height="120" viewBox="0 0 256 120" preserveAspectRatio="none">
        {data.map((v, i) => {
          const h = (v / max) * 100;
          return <rect key={i} x={i} y={120 - h} width="1" height={h} fill={color} opacity="0.7" />;
        })}
      </svg>
      {label && <div className="absolute bottom-0 right-0 text-[10px] text-[#6b7f99]">{label}</div>}
    </div>
  );
};

export const TransferCurves = ({ source, target }: { source: number[]; target: number[] }) => {
  return (
    <svg width="100%" height="160" viewBox="0 0 260 160" className="overflow-hidden">
      {/* Grille */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2e405f" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="260" height="160" fill="url(#grid)" />
      
      {/* Axes */}
      <line x1="20" y1="20" x2="20" y2="140" stroke="#3a4f73" strokeWidth="1" />
      <line x1="20" y1="140" x2="240" y2="140" stroke="#3a4f73" strokeWidth="1" />
      
      {/* Ligne diagonale de référence */}
      <line x1="20" y1="140" x2="240" y2="20" stroke="#3a4f73" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
      
      {/* Courbe source */}
      <path
        d={source.map((v, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * 0.85} ${140 - v * 0.4}`).join(' ')}
        fill="none" stroke="#ffb224" strokeWidth="2" opacity="0.8"
      />
      
      {/* Courbe cible */}
      <path
        d={target.map((v, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * 0.85} ${140 - v * 0.4}`).join(' ')}
        fill="none" stroke="#2ad4c2" strokeWidth="2"
      />
      
      {/* Labels */}
      <text x="130" y="155" textAnchor="middle" fill="#6b7f99" fontSize="10">Luminance (L*)</text>
      <text x="10" y="80" textAnchor="middle" fill="#6b7f99" fontSize="10" transform="rotate(-90, 10, 80)">CDF</text>
    </svg>
  );
};

export const CoeffHistogram = ({ coeffs }: { coeffs: number[] }) => {
  const max = Math.max(...coeffs.map(Math.abs), 1);
  const mid = 128;
  return (
    <svg width="100%" height="100" viewBox="0 0 256 100">
      {coeffs.map((v, i) => {
        const h = (Math.abs(v) / max) * 80;
        const x = mid + (i - coeffs.length / 2) * 2;
        const y = v >= 0 ? 50 - h : 50;
        const height = h;
        return (
          <rect key={i} x={x} y={y} width="1.5" height={height} fill={v >= 0 ? '#f45b8b' : '#4da6ff'} opacity="0.7" />
        );
      })}
      <line x1="0" y1="50" x2="256" y2="50" stroke="#3a4f73" strokeWidth="1" />
    </svg>
  );
};

export const JointHistogramCanvas = ({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) => {
  return <canvas ref={canvasRef} width="256" height="256" className="w-full h-full rounded-lg" style={{ imageRendering: 'pixelated' }} />;
};
