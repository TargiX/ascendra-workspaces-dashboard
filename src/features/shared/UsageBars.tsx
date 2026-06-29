import { ProgressBar } from "../../components/ui/ProgressBar";
import type { VM } from "../../domain/types";

export function UsageBars({ vm, compact = false }: { vm: Pick<VM, "cpuUsagePercent" | "memoryUsagePercent" | "diskUsagePercent">; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-3"}>
      <ProgressBar label="CPU" value={vm.cpuUsagePercent} />
      <ProgressBar label="Memory" value={vm.memoryUsagePercent} />
      <ProgressBar label="Disk" value={vm.diskUsagePercent} />
    </div>
  );
}
