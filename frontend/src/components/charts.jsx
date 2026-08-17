import React from 'react';

export const ChannelHistogram = ({ hist, color = '#2ad4c2' }) => {
  if (!hist) return <div className="w-full h-16 bg-panel rounded-lg skeleton" />;
  const max = Math.max(...hist);
  return (
    <div className="flex items-end gap-[2px] w-full h-20 p-2 rounded-lg bg-panel/50 border border-line">
      {hist.map((v, i) => (
        <div key={i} style={{ 
          height: `${(v / max) * 100}%`, 
          width: '3px', 
          backgroundColor: color,
          opacity: 0.4 + (v / max) * 0.6,
          borderRadius: '1px 1px 0 0'
        }} className="transition-all hover:opacity-100" />
      ))}
    </div>
  );
};

export const MiniHist = ({ hist }) => {
  if (!hist) return <div className="w-24 h-8 bg-panel rounded skeleton" />;
  const max = Math.max(...hist);
  return (
    <div className="flex items-end gap-[1px] w-28" style={{ height: '36px' }}>
      {hist.map((v, i) => (
        <div key={i} style={{ 
          height: `${(v / max) * 100}%`, 
          width: '2px', 
          backgroundColor: '#2ad4c2',
          opacity: 0.5 + (v / max) * 0.5,
          borderRadius: '1px 1px 0 0'
        }} />
      ))}
    </div>
  );
};
