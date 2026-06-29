import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FleetUtilization, VMStatus } from "../../domain/types";
import { formatPercent } from "../../lib/format";

export type UtilizationBucketMetric = "cpu" | "memory";

type VmMetric = FleetUtilization["vmMetrics"][number];

interface BucketDefinition {
  id: string;
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  tint: string;
}

interface BucketDatum extends BucketDefinition {
  count: number;
  average: number;
}

const activeStatuses = new Set<VMStatus>(["running", "starting", "stopping"]);

const buckets: BucketDefinition[] = [
  {
    id: "idle",
    label: "Idle",
    range: "0-10%",
    min: 0,
    max: 10,
    color: "#f59e0b",
    tint: "bg-amber-500",
  },
  {
    id: "low",
    label: "Low",
    range: "10-50%",
    min: 10,
    max: 50,
    color: "#98a2b3",
    tint: "bg-gray-400",
  },
  {
    id: "healthy",
    label: "Healthy",
    range: "50-80%",
    min: 50,
    max: 80,
    color: "#10b981",
    tint: "bg-emerald-500",
  },
  {
    id: "overloaded",
    label: "Overloaded",
    range: "80-100%",
    min: 80,
    max: 100,
    color: "#ef4444",
    tint: "bg-red-500",
  },
];

export function UtilizationBucketChart({
  metrics,
  metric,
  height = 340,
}: {
  metrics: VmMetric[];
  metric: UtilizationBucketMetric;
  height?: number;
}) {
  const metricKey = metric === "cpu" ? "cpuPercent" : "memoryPercent";
  const metricLabel = metric === "cpu" ? "CPU" : "Memory";
  const activeMetrics = metrics.filter((item) =>
    activeStatuses.has(item.status),
  );
  const data = buckets.map((bucket) => {
    const matchingMetrics = activeMetrics.filter((item) => {
      const value = clampPercent(item[metricKey]);
      const isLastBucket = bucket.max === 100;

      return (
        value >= bucket.min &&
        (isLastBucket ? value <= bucket.max : value < bucket.max)
      );
    });
    const average =
      matchingMetrics.length === 0
        ? 0
        : matchingMetrics.reduce(
            (sum, item) => sum + clampPercent(item[metricKey]),
            0,
          ) / matchingMetrics.length;

    return {
      ...bucket,
      count: matchingMetrics.length,
      average,
    };
  });
  const totalActive = activeMetrics.length;

  if (totalActive === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400"
        style={{ height }}
      >
        No active VM metrics to display.
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height }}>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.map((bucket) => (
          <div
            key={bucket.id}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${bucket.tint}`}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                {bucket.label}
              </span>
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {bucket.range}
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {bucket.count}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 4, right: 28, top: 6, bottom: 8 }}
            barCategoryGap={18}
          >
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[
                0,
                (max: number) => Math.max(1, Math.ceil(max * 1.15)),
              ]}
              tick={{ fill: "#667085", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="range"
              width={74}
              tick={{ fill: "#667085", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(152, 162, 179, 0.08)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const bucket = payload[0].payload as BucketDatum;

                return (
                  <div className="rounded-md border border-gray-200 bg-white p-3 text-[13px] dark:border-white/10 dark:bg-[#111]">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {bucket.label} · {bucket.range}
                    </p>
                    <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                      <div className="flex min-w-44 justify-between gap-6">
                        <span>VMs</span>
                        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                          {bucket.count}
                        </span>
                      </div>
                      <div className="flex min-w-44 justify-between gap-6">
                        <span>Avg {metricLabel}</span>
                        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                          {formatPercent(bucket.average)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              name={`${metricLabel} bucket`}
              radius={[0, 6, 6, 0]}
              barSize={34}
            >
              <LabelList
                dataKey="count"
                position="right"
                fill="#344054"
                fontSize={12}
                fontWeight={600}
              />
              {data.map((bucket) => (
                <Cell
                  key={bucket.id}
                  fill={bucket.color}
                  fillOpacity={0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {metricLabel} buckets across {totalActive} active VMs.
      </p>
    </div>
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
