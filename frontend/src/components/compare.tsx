import React from 'react';

export const CanvasView = ({ data, className }: { data: ImageData | null; className?: string }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (!data || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.putImageData(data, 0, 0);
  }, [data]);
  
  if (!data) return <div className={`bg-[#152033] rounded-lg animate-pulse ${className}`} />;
  
  return (
    <canvas ref={canvasRef} width={data.width} height={data.height} className={className} style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto' }} />
  );
};

export const CompareSlider = ({ before, after, onChange, value }: { before: ImageData | null; after: ImageData | null; onChange: (v: number) => void; value: number }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  
  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(x * 100));
  }, [onChange]);
  
  React.useEffect(() => {
    const onUp = () => setDragging(false);
    const onMove = (e: MouseEvent) => { if (dragging) handleMove(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (dragging) handleMove(e.touches[0].clientX); };
    
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onTouchMove);
    
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [dragging, handleMove]);
  
  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-[#152033] rounded-lg overflow-hidden cursor-ew-resize select-none"
      onMouseDown={() => setDragging(true)} onTouchStart={() => setDragging(true)}>
      {after && <CanvasView data={after} className="absolute inset-0 w-full h-full" />}
      {before && (
        <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
          <CanvasView data={before} className="w-full h-full" />
        </div>
      )}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-full bg-white/80 shadow-lg pointer-events-none" style={{ left: `${value}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d1421" strokeWidth="3">
            <polyline points="15 18 9 12 15 6" transform="rotate(180, 12, 12)" /><polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const HeatOverlay = ({ base, heat, opacity }: { base: ImageData | null; heat: Uint8Array | null; opacity: number }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (!base || !heat || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.putImageData(base, 0, 0);
    const img = ctx.createImageData(base.width, base.height);
    
    for (let i = 0; i < heat.length; i++) {
      const v = heat[i];
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = 255 - v;
      img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = Math.round((opacity / 100) * 180);
    }
    
    ctx.globalAlpha = 1;
    ctx.putImageData(img, 0, 0);
  }, [base, heat, opacity]);
  
  if (!base) return <div className="bg-[#152033] rounded-lg animate-pulse aspect-video" />;
  
  return <canvas ref={canvasRef} width={base.width} height={base.height} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />;
};
