export const HistogramChart = ({ data }: { data: { r: number[]; g: number[]; b: number[] } }) => (
  <div className="h-48">
    <svg width="100%" height="100%" viewBox="0 0 256 192" preserveAspectRatio="none">
      {[data.r, data.g, data.b].map((channel, ci) => {
        const max = Math.max(...channel, 1);
        const colors = ['#ef4444', '#22c55e', '#3b82f6'];
        return channel.map((v, i) => {
          const h = (v / max) * 160;
          return (
            <rect 
              key={`${ci}-${i}`} 
              x={i} 
              y={192 - h} 
              width="1" 
              height={h} 
              fill={colors[ci]} 
              opacity="0.5" 
            />
          );
        });
      })}
    </svg>
  </div>
);

export const TransferCurve = ({ data }: { data?: number[] }) => {
  const curve = data || Array.from({ length: 256 }, (_, i) => i + Math.sin(i * 0.1) * 20);
  const max = Math.max(...curve);
  return (
    <div className="h-48">
      <svg width="100%" height="100%" viewBox="0 0 256 192">
        <line x1="20" y1="20" x2="20" y2="172" stroke="#374151" strokeWidth="1" />
        <line x1="20" y1="172" x2="236" y2="172" stroke="#374151" strokeWidth="1" />
        <path
          d={curve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * 0.85} ${172 - (v / max) * 140}`).join(' ')}
          fill="none" stroke="#f59e0b" strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export const TextureMap = ({ data }: { data?: string }) => (
  <div className="h-48 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
    {data ? (
      <img src={data} alt="Texture map" className="w-full h-full object-cover" />
    ) : (
      <div className="text-gray-500 text-sm">Carte de texture non disponible</div>
    )}
  </div>
);

export const DCTHeatmap = ({ data }: { data?: number[][] }) => {
  const heatmap = data || Array.from({ length: 8 }, (_, y) => 
    Array.from({ length: 8 }, (_, x) => Math.random())
  );
  return (
    <div className="h-48 grid grid-cols-8 gap-0.5 p-2">
      {heatmap.flat().map((v, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            backgroundColor: `rgb(${Math.floor(v * 255)}, ${Math.floor((1 - v) * 100)}, ${Math.floor((1 - v) * 200)})`
          }}
        />
      ))}
    </div>
  );
};
