import type { VMStatus, VmHealth } from "../../domain/types";
import { getStatusLabel } from "../../lib/vm-analytics";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/cn";

export function StatusBadge({ status }: { status: VMStatus }) {
  const dotColor = {
    running: "bg-emerald-500",
    stopped: "bg-gray-400 dark:bg-gray-500",
    starting: "bg-amber-500",
    stopping: "bg-amber-500",
    error: "bg-red-500",
  } as const;

  const isActive = status === "running" || status === "starting" || status === "stopping";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      <span className={cn("size-1.5 rounded-full", dotColor[status], isActive && "animate-pulse-dot")} aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

export function HealthBadge({ health }: { health: VmHealth }) {
  const tone = {
    healthy: "success",
    idle: "warning",
    hot: "orange",
    error: "danger",
    transitioning: "purple",
    stopped: "gray",
  } as const;

  const label = {
    healthy: "Healthy",
    idle: "Idle",
    hot: "Hot",
    error: "Error",
    transitioning: "Transitioning",
    stopped: "Stopped",
  } as const;

  return (
    <Badge tone={tone[health]} dot pulse={health === "transitioning"}>
      {label[health]}
    </Badge>
  );
}
