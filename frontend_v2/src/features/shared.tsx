/** Éléments partagés par les onglets fonctionnels. */

export function Placeholder({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-pulse-dot h-2 w-2 rounded-full bg-amber" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
      <span className="font-mono text-[11.5px] text-faint">{msg}</span>
    </div>
  );
}