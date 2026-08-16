import React from 'react';

export const ChannelHistogram = ({ hist, color = '#2ad4c2' }) => {
  if (!hist) return null;
  const max = Math.max(...hist);
  return (
    <div className="flex items-end gap-[1px]" style={{ height: '60px' }}>
      {hist.map((v, i) => (
        <div key={i} style={{ 
          height: `${(v / max) * 100}%`, 
          width: '2px', 
          backgroundColor: color,
          opacity: 0.3 + (v / max) * 0.7
        }} />
      ))}
    </div>
  );
};

export const MiniHist = ({ hist }) => {
  if (!hist) return <div className="w-24 h-8 bg-panel rounded" />;
  const max = Math.max(...hist);
  return (
    <div className="flex items-end gap-[1px] w-24" style={{ height: '32px' }}>
      {hist.map((v, i) => (
        <div key={i} style={{ 
          height: `${(v / max) * 100}%`, 
          width: '1.5px', 
          backgroundColor: '#2ad4c2',
          opacity: 0.4 + (v / max) * 0.6
        }} />
      ))}
    </div>
  );
};
