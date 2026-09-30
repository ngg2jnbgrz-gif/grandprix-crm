"use client";

export type RadarTarget = {
  id: string;
  company: string;
  worked: boolean;
};

/** Deterministic pseudo-random placement from the id — stable across renders. */
function placement(id: string): { angle: number; radius: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radius = 18 + (h % 55); // 18–73% of the radar radius
  return { angle, radius };
}

/**
 * JARVIS-style target radar. Blips are the remaining (unworked) hot
 * targets; clicking one jumps the deck straight to it.
 */
export function TargetRadar({
  targets,
  activeId,
  onSelect,
}: {
  targets: RadarTarget[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const remaining = targets.filter((t) => !t.worked);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <style>{`
        @keyframes radar-sweep { to { transform: rotate(360deg); } }
        @keyframes radar-ping {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      {/* rings */}
      <div className="absolute inset-0 rounded-full border border-hud-line/70" />
      <div className="absolute inset-[16%] rounded-full border border-hud-line/50" />
      <div className="absolute inset-[33%] rounded-full border border-hud-line/40" />
      <div className="absolute inset-[49%] rounded-full border border-hud-line/30" />
      {/* crosshairs */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-hud-line/25" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-hud-line/25" />

      {/* sweep */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(34,211,238,0.35), transparent 22%)",
          animation: "radar-sweep 5s linear infinite",
        }}
      />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.06),transparent_70%)]" />

      {/* blips */}
      {remaining.map((t) => {
        const { angle, radius } = placement(t.id);
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isActive = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            title={t.company}
            aria-label={`Target ${t.company}`}
            onClick={() => onSelect(t.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-150"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animation: "radar-ping 2.4s ease-in-out infinite",
            }}
          >
            <span
              className={`block rounded-full ${
                isActive
                  ? "h-3.5 w-3.5 bg-[var(--hud-accent)] shadow-[0_0_12px_var(--hud-accent)]"
                  : "h-2.5 w-2.5 bg-hud-amber shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              }`}
            />
          </button>
        );
      })}

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-2xl font-bold tabular-nums text-[var(--hud-accent)]">
            {remaining.length}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-hud-muted">
            targets
          </p>
        </div>
      </div>
    </div>
  );
}
