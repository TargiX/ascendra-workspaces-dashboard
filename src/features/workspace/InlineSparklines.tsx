import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { queryKeys, workspaceApi } from "../../api/client";
import { Skeleton } from "../../components/ui/Skeleton";
import type { VMStatus, VMUsagePoint } from "../../domain/types";

type MetricDataKey = "cpuPercent" | "memoryPercent" | "diskPercent";

const metricMeta: Record<MetricDataKey, { label: string; color: string }> = {
  cpuPercent: { label: "CPU", color: "#7c3aed" },
  memoryPercent: { label: "Memory", color: "#2563eb" },
  diskPercent: { label: "Disk", color: "#d97706" },
};

function formatMetricTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function buildFallbackData({ cpu, memory, disk }: { cpu: number; memory: number; disk: number }): VMUsagePoint[] {
  const now = Date.now();

  return Array.from({ length: 16 }, (_, index) => ({
    timestamp: new Date(now - (15 - index) * 5 * 60 * 1000).toISOString(),
    cpuPercent: cpu,
    memoryPercent: memory,
    diskPercent: disk,
  }));
}

function MetricTooltip({
  active,
  payload,
  metricKey,
  fallback,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; dataKey?: string; payload?: VMUsagePoint }>;
  metricKey: MetricDataKey;
  fallback: boolean;
}) {
  if (!active || !payload?.length) return null;

  const timestamp = payload[0]?.payload?.timestamp;
  const item = payload.find((entry) => entry.dataKey === metricKey) ?? payload[0];
  const meta = metricMeta[metricKey];

  return (
    <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 dark:border-white/10 dark:bg-[#111] dark:text-gray-300">
      <div className="font-mono text-[11px] text-gray-500 dark:text-gray-500">
        {fallback || !timestamp ? "Current snapshot" : formatMetricTime(timestamp)}
      </div>
      <div className="mt-1.5 flex min-w-28 items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
          {meta.label}
        </span>
        <span className="font-mono text-[12px] text-gray-950 dark:text-gray-50">
          {Math.round(Number(item.value ?? 0))}%
        </span>
      </div>
    </div>
  );
}

function MetricSparkline({
  data,
  fallback,
  metricKey,
  muted,
  value,
}: {
  data: VMUsagePoint[];
  fallback: boolean;
  metricKey: MetricDataKey;
  muted: boolean;
  value: number;
}) {
  const meta = metricMeta[metricKey];

  return (
    <div className="grid min-h-11 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4">
      <div className="min-w-0">
        <dt className="truncate text-[12px] font-medium text-gray-500 dark:text-gray-400">{meta.label}</dt>
        <dd className="mt-0.5 font-mono text-[15px] font-semibold leading-5 text-gray-900 dark:text-gray-100">
          {Math.round(value)}%
        </dd>
      </div>
      <div className="relative h-9 min-w-0">
        <span className="pointer-events-none absolute inset-x-0 bottom-1 h-px bg-gray-200 dark:bg-white/10" aria-hidden="true" />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 2, right: 2, top: 6, bottom: 6 }}>
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              content={<MetricTooltip fallback={fallback} metricKey={metricKey} />}
              cursor={{ stroke: "#98a2b3", strokeOpacity: 0.22, strokeWidth: 1 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />
            <Line
              activeDot={{ r: 2.5, stroke: meta.color, strokeWidth: 1.5 }}
              dataKey={metricKey}
              dot={false}
              isAnimationActive={false}
              stroke={meta.color}
              strokeOpacity={muted ? 0.45 : 0.9}
              strokeWidth={1.6}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricSkeletonRow({ label }: { label: string }) {
  return (
    <div className="grid min-h-11 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4">
      <div className="min-w-0">
        <dt className="truncate text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1">
          <Skeleton className="h-4 w-9" />
        </dd>
      </div>
      <div className="relative h-9 min-w-0">
        <span className="pointer-events-none absolute inset-x-0 bottom-1 h-px bg-gray-200 dark:bg-white/10" aria-hidden="true" />
        <div className="flex h-full items-center">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

function MetricRowsSkeleton() {
  return (
    <dl className="space-y-3" aria-busy="true" aria-label="Telemetry updating">
      {(Object.keys(metricMeta) as MetricDataKey[]).map((metricKey) => (
        <MetricSkeletonRow key={metricKey} label={metricMeta[metricKey].label} />
      ))}
    </dl>
  );
}

export function InlineSparklines({
  machineId,
  status,
  cpu,
  memory,
  disk,
}: {
  machineId: string;
  status: VMStatus;
  cpu: number;
  memory: number;
  disk: number;
}) {
  const metricsQuery = useQuery({
    queryKey: queryKeys.workspaceMachineMetrics(machineId),
    queryFn: () => workspaceApi.getMachineMetrics(machineId),
    enabled: status !== "stopped",
  });
  const transitioning = status === "starting" || status === "stopping";

  if (transitioning || metricsQuery.isLoading) {
    return <MetricRowsSkeleton />;
  }

  const fallback = !metricsQuery.data?.length || status === "stopped" || metricsQuery.isError;
  const fallbackData = buildFallbackData({ cpu, memory, disk });
  const data = metricsQuery.data?.length ? metricsQuery.data : fallbackData;
  const muted = metricsQuery.isError;
  const metrics = [
    { key: "cpuPercent", value: cpu, ...metricMeta.cpuPercent },
    { key: "memoryPercent", value: memory, ...metricMeta.memoryPercent },
    { key: "diskPercent", value: disk, ...metricMeta.diskPercent },
  ] satisfies Array<{ key: MetricDataKey; value: number; label: string; color: string }>;

  return (
    <dl className="space-y-3">
      {metrics.map((metric) => (
        <MetricSparkline
          data={data}
          fallback={fallback}
          key={metric.key}
          metricKey={metric.key}
          muted={muted}
          value={metric.value}
        />
      ))}
    </dl>
  );
}
