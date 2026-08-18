import { useEffect, useRef, useState } from "react";

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
