import { cn } from "../../lib/cn";

type StatCardTone = "default" | "success" | "warning" | "danger" | "brand";

const toneAccents: Record<StatCardTone, string> = {
  default: "",
  success: "border-emerald-200 bg-emerald-50/30 dark:border-emerald-500/20 dark:bg-emerald-500/5",
  warning: "border-amber-200 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5",
  danger: "border-red-200 bg-red-50/30 dark:border-red-500/20 dark:bg-red-500/5",
  brand: "border-brand-200 bg-brand-50/30 dark:border-brand-500/20 dark:bg-brand-500/5",
};

const iconToneClasses: Record<StatCardTone, string> = {
  default: "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
  brand: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400",
};

export function StatCard({
  label,
  value,
  helper,
  trend,
  icon,
  iconTone = "default",
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  trend?: string;
  icon?: React.ReactNode;
  iconTone?: StatCardTone;
  tone?: StatCardTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-150 hover:border-gray-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-white/20",
        toneAccents[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-5 text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-[25px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums dark:text-gray-50">
            {value}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trend ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
              {trend}
            </span>
          ) : null}
          {icon ? (
            <div className={cn("flex size-8 items-center justify-center rounded-full border", iconToneClasses[iconTone])}>
              {icon}
            </div>
          ) : null}
        </div>
      </div>
      {helper ? <p className="mt-2 text-[13px] leading-5 text-gray-500 dark:text-gray-400">{helper}</p> : null}
    </div>
  );
}
