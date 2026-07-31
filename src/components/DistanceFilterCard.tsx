import { Slider } from "@/components/ui/slider";

export interface ActiveChip {
  key: string;
  label: string;
  emoji?: string;
  onRemove: () => void;
}

interface Props {
  count: number;
  radiusKm: number | null;
  setRadiusKm: (v: number | null) => void;
  chips: ActiveChip[];
  originLabel?: string;
  className?: string;
}

const STEPS: { value: number | null; label: string }[] = [
  { value: 0.5, label: "500m" },
  { value: 1, label: "1 km" },
  { value: 2, label: "2 km" },
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: null, label: "All SG" },
];

const radiusLabel = (r: number | null) => {
  if (r === null) return "all of Singapore";
  if (r < 1) return `${Math.round(r * 1000)}m`;
  return `${r} km`;
};

const DistanceFilterCard = ({ count, radiusKm, setRadiusKm, chips, originLabel, className = "" }: Props) => {
  const currentIndex = (() => {
    const i = STEPS.findIndex((s) => s.value === radiusKm);
    return i === -1 ? STEPS.length - 1 : i;
  })();

  const scope =
    radiusKm === null
      ? `across Singapore${originLabel ? ` from ${originLabel}` : ""}`
      : `within ${radiusLabel(radiusKm)}${originLabel ? ` of ${originLabel}` : ""}`;

  return (
    <div
      className={`bg-card rounded-2xl border border-border/60 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_14px_34px_-22px_rgba(16,24,40,0.28)] p-4 md:p-5 ${className}`}
    >
      {/* Result summary */}
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] md:text-[26px] font-bold text-foreground tabular-nums leading-none tracking-tight">
          {count}
        </span>
        <span className="text-[13px] text-muted-foreground leading-snug">
          {count === 1 ? "business" : "businesses"} {scope}
        </span>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.onRemove}
              className="group inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full border border-border bg-secondary/40 text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors"
            >
              {c.emoji && <span aria-hidden="true">{c.emoji}</span>}
              <span>{c.label}</span>
              <span className="w-4 h-4 inline-flex items-center justify-center rounded-full text-muted-foreground group-hover:text-foreground group-hover:bg-foreground/5 text-sm leading-none transition-colors">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Distance control */}
      <div className="mt-4 md:mt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Distance
          </span>
          <span className="text-[11px] font-bold text-foreground tabular-nums px-2 py-0.5 rounded-full bg-[#fada50]/25 border border-[#fada50]/50">
            {STEPS[currentIndex].label}
          </span>
        </div>

        <Slider
          value={[currentIndex]}
          onValueChange={([v]) => setRadiusKm(STEPS[v].value)}
          min={0}
          max={STEPS.length - 1}
          step={1}
          aria-label="Distance"
        />

        {/* Uniform, tick-aligned labels */}
        <div className="relative mt-2.5 h-4">
          {STEPS.map((s, i) => {
            const pct = (i / (STEPS.length - 1)) * 100;
            const transform = i === 0 ? "none" : i === STEPS.length - 1 ? "translateX(-100%)" : "translateX(-50%)";
            return (
              <button
                key={s.label}
                onClick={() => setRadiusKm(s.value)}
                style={{ position: "absolute", left: `${pct}%`, transform }}
                className={`text-[10px] md:text-[11px] tabular-nums transition-colors ${
                  i === currentIndex
                    ? "text-foreground font-bold"
                    : "text-muted-foreground/70 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DistanceFilterCard;
