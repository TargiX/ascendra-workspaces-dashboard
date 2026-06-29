import { cn } from "../../lib/cn";

type BadgeTone = "gray" | "brand" | "success" | "warning" | "orange" | "danger" | "purple";

const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-gray-50 text-gray-700 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10",
  brand: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
  danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
};

const dotColors: Record<BadgeTone, string> = {
  gray: "bg-gray-400 dark:bg-gray-500",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  orange: "bg-orange-500",
  danger: "bg-red-500",
  purple: "bg-violet-500",
};

export function Badge({
  children,
  tone = "gray",
  dot = false,
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("size-1.5 rounded-full", dotColors[tone], pulse && "animate-pulse-dot")}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
