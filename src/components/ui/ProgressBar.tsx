import { cn } from "../../lib/cn";

function getTone(value: number) {
  if (value >= 85) return "from-red-500 to-red-400";
  if (value >= 70) return "from-amber-500 to-amber-400";
  if (value <= 10) return "from-gray-300 to-gray-300 dark:from-gray-600 dark:to-gray-600";
  return "from-brand-600 to-brand-400";
}

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-3 text-[13px] text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{Math.round(safeValue)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500 animate-fill-width", getTone(safeValue))}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
