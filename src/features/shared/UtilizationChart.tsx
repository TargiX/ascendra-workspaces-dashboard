import {
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { formatPercent } from "../../lib/format";

interface Point {
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  runningVms?: number;
}

export function UtilizationChart({
  data,
  height = 300,
  threshold = 85,
  tickFormat = "HH:mm",
  tooltipFormat = "MMM d, HH:mm",
}: {
  data: Point[];
  height?: number;
  threshold?: number;
  tickFormat?: string;
  tooltipFormat?: string;
}) {
  const hasRunningVmSeries = data.some(
    (point) => typeof point.runningVms === "number",
  );
  const runningVmMax = hasRunningVmSeries
    ? Math.max(1, ...data.map((point) => point.runningVms ?? 0))
    : 1;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ left: -16, right: 10, top: 8, bottom: 0 }}
        >
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => format(new Date(value), tickFormat)}
            tick={{ fill: "#667085", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="percent"
            domain={[0, 100]}
            tickFormatter={formatPercent}
            tick={{ fill: "#667085", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          {hasRunningVmSeries ? (
            <YAxis
              yAxisId="vms"
              orientation="right"
              domain={[0, Math.ceil(runningVmMax * 1.2)]}
              allowDecimals={false}
              tickFormatter={(value) => `${Math.round(Number(value))}`}
              tick={{ fill: "#667085", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
          ) : null}
          <Tooltip
            cursor={{ stroke: "#98a2b3", strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              return (
                <div className="rounded-md border border-gray-200 bg-white p-3 text-[13px] dark:border-white/10 dark:bg-[#111]">
                  <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                    {label
                      ? format(new Date(String(label)), tooltipFormat)
                      : "Current point"}
                  </p>
                  {payload.map((item, index) => {
                    const key =
                      typeof item.dataKey === "string" ||
                      typeof item.dataKey === "number"
                        ? String(item.dataKey)
                        : `metric-${index}`;

                    return (
                      <div
                        key={key}
                        className="flex min-w-40 items-center justify-between gap-5 text-gray-600 dark:text-gray-400"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                          {key.includes("running")
                            ? Math.round(Number(item.value))
                            : `${Math.round(Number(item.value))}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {threshold ? (
            <ReferenceLine
              yAxisId="percent"
              y={threshold}
              stroke="#f87171"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          ) : null}
          <Line
            yAxisId="percent"
            type="monotone"
            name="CPU"
            dataKey="cpuPercent"
            stroke="#1570ef"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="percent"
            type="monotone"
            name="Memory"
            dataKey="memoryPercent"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {hasRunningVmSeries ? (
            <Line
              yAxisId="vms"
              type="monotone"
              name="Active VMs"
              dataKey="runningVms"
              stroke="#667085"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
