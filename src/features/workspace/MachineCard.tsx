import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, CpuChip01, Globe01, Server01 } from "@untitledui/icons";
import type { ComponentType, ReactNode } from "react";
import type { VMStatus, VMWithRelations } from "../../domain/types";
import { Card } from "../../components/ui/Card";
import { MachineActions } from "./MachineActions";
import { InlineSparklines } from "./InlineSparklines";
import { ServiceIcon } from "./ServiceIcon";
import { TemplateInfoPopover } from "./TemplateInfoPopover";
import { cn } from "../../lib/cn";
import { getStatusLabel } from "../../lib/vm-analytics";

const statusDotClasses = {
  running: "bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-500/20",
  stopped: "bg-gray-400 ring-2 ring-gray-100 dark:bg-gray-500 dark:ring-gray-500/20",
  starting: "bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-500/20",
  stopping: "bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-500/20",
  error: "bg-red-500 ring-2 ring-red-100 dark:ring-red-500/20",
} as const;

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

function formatUptimeValue(startedAt: string | null, status: VMStatus) {
  if (status === "stopped" || !startedAt) return "0s";

  const startedAtMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return "0s";

  const minutes = Math.max(0, Math.floor((Date.now() - startedAtMs) / 60_000));
  if (minutes < 1) return "<1m";

  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
}

function SpecChip({ icon: Icon, children, label }: { icon: IconComponent; children: ReactNode; label?: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-[12px] font-medium text-gray-600 dark:border-white/10 dark:bg-[#111] dark:text-gray-300"
      title={label}
    >
      <Icon className="size-3.5 shrink-0 text-gray-500 dark:text-gray-400" strokeWidth={1.8} aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function MachineCard({ machine, className }: { machine: VMWithRelations; className?: string }) {
  const navigate = useNavigate();
  const detailParams = { machineId: machine.id };
  const isStopped = machine.status === "stopped";
  const statusLabel = getStatusLabel(machine.status);
  const uptimeValue = formatUptimeValue(machine.startedAt, machine.status);

  function openDetails() {
    void navigate({ to: "/workspace/machines/$machineId", params: detailParams });
  }

  return (
    <Card className={cn("group relative", className)} hoverable>
      <Link
        to="/workspace/machines/$machineId"
        params={detailParams}
        aria-label={`View details for ${machine.name}`}
        className="absolute inset-0 z-10 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-950 dark:focus-visible:ring-gray-100"
      />
      <div className="pointer-events-none relative z-20">
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            <ServiceIcon template={machine.template} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-label={`${statusLabel} status`}
                  className="status-dot-trigger pointer-events-auto relative inline-flex size-2.5 shrink-0 cursor-default items-center justify-center"
                >
                  <span className={cn("size-2.5 rounded-full", statusDotClasses[machine.status])} aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="status-dot-tooltip pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] font-medium text-gray-700 opacity-0 shadow-xs transition-opacity duration-150 dark:border-white/10 dark:bg-[#111] dark:text-gray-200"
                  >
                    {statusLabel}
                  </span>
                </span>
                <span className="block truncate text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-brand-700 dark:text-gray-100 dark:group-hover:text-brand-400">
                  {machine.name}
                </span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 truncate text-[13px] text-gray-500 dark:text-gray-400">
                  {machine.template.name} · {machine.template.baseImage}
                  <span className="xl:hidden"> · {machine.region}</span>
                </p>
                <span className="pointer-events-auto">
                  <TemplateInfoPopover template={machine.template} />
                </span>
              </div>
            </div>
            <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
              <MachineActions
                machine={machine}
                className="flex items-center justify-end gap-2 xl:hidden"
                primaryClassName="h-8 px-2.5 sm:px-3"
                primaryVariant={isStopped ? "primary" : "secondary"}
                showMenu={false}
                secondaryClassName="size-9"
              />
              <MachineActions machine={machine} mode="menu" secondaryClassName="size-8" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SpecChip icon={Clock} label={`Uptime ${uptimeValue}`}>
              {uptimeValue}
            </SpecChip>
            <SpecChip icon={CpuChip01}>{machine.template.vCpu} vCPU</SpecChip>
            <SpecChip icon={Server01}>{machine.template.memoryGb} GB</SpecChip>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-4 dark:border-white/10">
          <div className="pointer-events-auto cursor-pointer" onClick={openDetails}>
            <InlineSparklines
              cpu={machine.cpuUsagePercent}
              disk={machine.diskUsagePercent}
              machineId={machine.id}
              memory={machine.memoryUsagePercent}
              status={machine.status}
            />
          </div>
        </div>

        <div className="hidden border-t border-gray-200 p-4 pt-3 dark:border-white/10 xl:block">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[12px] text-gray-500 dark:text-gray-400">
              <Globe01 className="mr-1.5 inline size-3.5 align-[-2px] text-gray-400 dark:text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              Region{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {machine.region}
              </span>
            </p>
            <div className="pointer-events-auto shrink-0">
              <MachineActions
                machine={machine}
                className="flex items-center justify-end gap-2"
                primaryClassName="h-8 px-3"
                primaryVariant={isStopped ? "primary" : "secondary"}
                showMenu={false}
                secondaryClassName="size-9"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
