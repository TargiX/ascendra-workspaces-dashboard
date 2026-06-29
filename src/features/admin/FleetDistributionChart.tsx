import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ZAxis,
} from "recharts";
import type { VMWithRelations } from "../../domain/types";
import { cn } from "../../lib/cn";

const healthColors: Record<string, string> = {
  healthy: "#10b981",
  idle: "#f59e0b",
  hot: "#f97316",
  error: "#ef4444",
  transitioning: "#8b5cf6",
  stopped: "#9ca3af",
};

const healthLabels: Record<string, string> = {
  healthy: "Healthy",
  idle: "Idle",
  hot: "Hot",
  error: "Error",
  transitioning: "Transitioning",
  stopped: "Stopped",
};

interface DataPoint {
  id: string;
  vmName: string;
  owner: string;
  cpu: number;
  memory: number;
  cost: number;
  health: string;
}

export type DistributionQuadrant = "idle" | "hot" | "memory-heavy" | "cpu-heavy";

export function FleetDistributionChart({
  vms,
  onPointSelect,
  onQuadrantSelect,
}: {
  vms: VMWithRelations[];
  onPointSelect?: (vmId: string) => void;
  onQuadrantSelect?: (quadrant: DistributionQuadrant) => void;
}) {
  const data: DataPoint[] = vms
    .filter((vm) => vm.status !== "stopped")
    .map((vm) => ({
      id: vm.id,
      vmName: vm.name,
      owner: vm.owner.name,
      cpu: vm.cpuUsagePercent,
      memory: vm.memoryUsagePercent,
      cost: vm.hourlyCost,
      health: vm.health,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        No active VMs to display.
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: 340 }}>
      <div className="pointer-events-none absolute inset-0 z-10">
        <QuadrantButton className="left-3 top-3" label="Memory-heavy" onClick={() => onQuadrantSelect?.("memory-heavy")} />
        <QuadrantButton className="right-3 top-3" label="Hot" onClick={() => onQuadrantSelect?.("hot")} />
        <QuadrantButton className="bottom-8 left-3" label="Idle" onClick={() => onQuadrantSelect?.("idle")} />
        <QuadrantButton className="bottom-8 right-3" label="CPU-heavy" onClick={() => onQuadrantSelect?.("cpu-heavy")} />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: -8, right: 24, top: 16, bottom: 8 }}>
          <XAxis
            type="number"
            dataKey="cpu"
            name="CPU"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: "#667085", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "CPU %", position: "insideBottomRight", offset: -4, style: { fill: "#667085", fontSize: 12 } }}
          />
          <YAxis
            type="number"
            dataKey="memory"
            name="Memory"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: "#667085", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Memory %", angle: -90, position: "insideLeft", offset: 16, style: { fill: "#667085", fontSize: 12 } }}
          />
          <ReferenceArea x1={0} x2={10} y1={0} y2={25} fill="#f59e0b" fillOpacity={0.08} strokeOpacity={0} />
          <ReferenceArea x1={85} x2={100} y1={85} y2={100} fill="#ef4444" fillOpacity={0.06} strokeOpacity={0} />
          <ReferenceLine x={10} stroke="#fbbf24" strokeDasharray="4 4" />
          <ReferenceLine y={25} stroke="#fbbf24" strokeDasharray="4 4" />
          <ReferenceLine x={85} stroke="#fca5a5" strokeDasharray="4 4" />
          <ReferenceLine y={85} stroke="#fca5a5" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: "#98a2b3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as DataPoint;
              return (
                <div className="rounded-md border border-gray-200 bg-white p-3 text-[13px] dark:border-white/10 dark:bg-[#111]">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{point.vmName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{point.owner} · {healthLabels[point.health] ?? point.health}</p>
                  <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between gap-6">
                      <span>CPU</span>
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{point.cpu}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span>Memory</span>
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{point.memory}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span>Cost</span>
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">${point.cost.toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <ZAxis type="number" dataKey="cost" range={[70, 260]} />
          <Scatter
            data={data}
            isAnimationActive={false}
            onClick={(point: unknown) => {
              const payload = (point as { payload?: DataPoint }).payload;
              if (payload) onPointSelect?.(payload.id);
            }}
            className={onPointSelect ? "cursor-pointer" : undefined}
          >
            {data.map((point, index) => (
              <Cell
                key={`cell-${index}`}
                fill={healthColors[point.health] || "#9ca3af"}
                fillOpacity={0.75}
                stroke={healthColors[point.health] || "#9ca3af"}
                strokeWidth={1.5}
                strokeOpacity={0.3}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuadrantButton({
  label,
  className,
  onClick,
}: {
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "pointer-events-auto absolute rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-[#111]/85 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-100",
        className,
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
