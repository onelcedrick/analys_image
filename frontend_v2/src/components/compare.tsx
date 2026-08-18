import { useEffect, useRef, useState } from "react";
import { renderHeatCanvas } from "../lib/processing";
import type { ForensicResult } from "../lib/processing";

export function CompareSlider({
  before,
  after,
  labelA,
  labelB,
}: {
  before: ImageData;
  after: ImageData;
  labelA?: string;
  labelB?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pos, setPos] = useState(50);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const w = before.width;
    const h = before.height;
    c.width = w;
    c.height = h;
    c.style.width = "100%";
    c.style.height = "auto";

    // draw base (before)
    ctx.putImageData(before, 0, 0);

    // draw after into an offscreen canvas
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.putImageData(after, 0, 0);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // base
      ctx.putImageData(before, 0, 0);
      // clipped after
      const clipW = Math.max(0, Math.min(1, pos / 100)) * w;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipW, h);
      ctx.clip();
      ctx.drawImage(off, 0, 0);
      ctx.restore();

      // divider
      const x = clipW;
      ctx.strokeStyle = "rgba(255,178,36,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    };

    draw();
  }, [before, after, pos]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] text-faint">
        <div>{labelA || "Avant"}</div>
        <div className="font-mono text-[11px]">{pos}%</div>
        <div>{labelB || "Après"}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

export default CompareSlider;

export function CanvasView({ data, className }: { data: ImageData | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (!data) {
      // clear
      c.width = 1;
      c.height = 1;
      ctx.clearRect(0, 0, 1, 1);
      return;
    }
    c.width = data.width;
    c.height = data.height;
    c.style.width = "100%";
    c.style.height = "auto";
    ctx.putImageData(data, 0, 0);
  }, [data]);
  if (!data) return <div className={className} />;
  return <canvas ref={ref} className={`${className ?? "w-full"} rounded-lg`} />;
}

export function HeatOverlay({ forensic, opacity }: { forensic: ForensicResult; opacity: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // clear
    root.innerHTML = "";
    const c = renderHeatCanvas(forensic);
    c.style.width = "100%";
    c.style.height = "auto";
    c.style.opacity = String(opacity / 100);
    c.style.pointerEvents = "none";
    c.className = "absolute inset-0 h-auto w-full";
    root.appendChild(c);
  }, [forensic, opacity]);
  return <div ref={ref} className="absolute inset-0" />;
}
