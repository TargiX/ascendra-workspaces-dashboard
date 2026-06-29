import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Terminal } from "@untitledui/icons";
import { workspaceApi, queryKeys } from "../../api/client";
import { ButtonLink, buttonClassName } from "../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatCurrency, formatDateTime, formatDuration, relativeTime } from "../../lib/format";
import { PageHeader } from "../shared/PageHeader";
import { StatusBadge, HealthBadge } from "../shared/StatusBadge";
import { UsageBars } from "../shared/UsageBars";
import { UtilizationChart } from "../shared/UtilizationChart";
import { MachineActions } from "./MachineActions";

export function MachineDetailPage() {
  const { machineId } = useParams({ from: "/authenticated/workspace/machines/$machineId" });

  const machineQuery = useQuery({
    queryKey: queryKeys.workspaceMachine(machineId),
    queryFn: () => workspaceApi.getMachine(machineId),
  });

  const metricsQuery = useQuery({
    queryKey: queryKeys.workspaceMachineMetrics(machineId),
    queryFn: () => workspaceApi.getMachineMetrics(machineId),
  });

  if (machineQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-[420px] rounded-lg" />
          <Skeleton className="h-[420px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (machineQuery.isError || !machineQuery.data) {
    return <ErrorState title="Machine not found" description="This workspace is not available for the current engineer." />;
  }

  const machine = machineQuery.data;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Machine Detail"
        title={machine.name}
        description="Current workspace status, browser IDE access, resource usage and template metadata."
        actions={
          <>
            <Link to="/workspace/machines" className={buttonClassName({ variant: "secondary" })}>
              <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
              Back
            </Link>
            <MachineActions machine={machine} showOpenIde={false} />
          </>
        }
      />

      {machine.status === "running" ? (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-fade-in-up dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div>
            <p className="text-[13px] font-semibold text-emerald-900 dark:text-emerald-400">Your workspace is ready</p>
            <p className="mt-1 text-[13px] text-emerald-700 dark:text-emerald-500">Connected to {machine.template.name} · {machine.region}</p>
          </div>
          <ButtonLink
            className="border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:border-emerald-600 dark:hover:bg-emerald-600"
            href={machine.ideUrl}
            size="md"
            target="_blank"
            variant="primary"
            rel="noreferrer"
          >
            <Terminal className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Open in IDE
          </ButtonLink>
        </div>
      ) : null}

      {machine.health === "idle" ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 animate-fade-in-up dark:border-amber-500/20 dark:bg-amber-500/10">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm dark:bg-amber-500/20 dark:text-amber-500">⚡</span>
          <div>
            <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-400">This machine has been idle</p>
            <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-500">Low CPU and memory usage detected. It may auto-stop based on your organization's policy.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Usage over time</CardTitle>
                <CardDescription>CPU and memory trend for the last 24 hours.</CardDescription>
              </div>
              <dl className="flex flex-wrap gap-2">
                <BadgeField label="Status">
                  <StatusBadge status={machine.status} />
                </BadgeField>
                <BadgeField label="Signal">
                  <HealthBadge health={machine.health} />
                </BadgeField>
              </dl>
            </div>
          </CardHeader>
          <CardContent>
            {metricsQuery.isLoading ? (
              <Skeleton className="h-[320px] rounded-xl" />
            ) : metricsQuery.isError ? (
              <ErrorState title="Metrics unavailable" description="Telemetry could not be loaded for this machine." onRetry={() => void metricsQuery.refetch()} />
            ) : (
              <UtilizationChart data={metricsQuery.data ?? []} height={320} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current usage</CardTitle>
              <CardDescription>Current CPU, memory and disk utilization.</CardDescription>
            </CardHeader>
            <CardContent>
              <UsageBars vm={machine} compact />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Template, specs and runtime information.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Template</dt>
                  <dd className="text-right font-medium text-gray-900 dark:text-gray-100">{machine.template.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Specs</dt>
                  <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                    {machine.template.vCpu} vCPU · {machine.template.memoryGb} GB · {machine.template.diskSizeGb} GB
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Region</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{machine.region}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Uptime</dt>
                  <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatDuration(machine.uptimeMinutes)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Last active</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{relativeTime(machine.lastActiveAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(machine.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Cost</dt>
                  <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(machine.hourlyCost)}/hr</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BadgeField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <dt className="text-[11px] text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 flex min-h-6 items-center">{children}</dd>
    </div>
  );
}
