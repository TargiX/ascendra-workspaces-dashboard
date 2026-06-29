export type VMStatus = "running" | "stopped" | "starting" | "stopping" | "error";
export type VMLifecycleAction = "start" | "stop" | "restart";
export type FleetPeriod = "24h" | "7d" | "30d";

export interface VM {
  id: string;
  name: string;
  ownerId: string;
  templateId: string;
  status: VMStatus;
  lifecycleAction?: VMLifecycleAction | null;
  region: string;
  createdAt: string;
  startedAt: string | null;
  lastActiveAt: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  hourlyCost: number;
}

export interface VMTemplate {
  id: string;
  name: string;
  description: string;
  baseImage: string;
  vCpu: number;
  memoryGb: number;
  diskSizeGb: number;
  preinstalledTools: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "engineer" | "admin";
  team: string;
  vmCount: number;
}

export interface FleetUtilization {
  period: string;
  totalVms: number;
  runningVms: number;
  stoppedVms: number;
  totalUsers: number;
  avgCpuUtilizationPercent: number;
  peakCpuUtilizationPercent: number;
  avgMemoryUtilizationPercent: number;
  peakMemoryUtilizationPercent: number;
  totalHourlyCost: number;
  monthToDateCost: number;
  projectedMonthlyCost: number;
  utilizationTrend: {
    timestamp: string;
    cpuPercent: number;
    memoryPercent: number;
    runningVms: number;
  }[];
  vmMetrics: {
    vmId: string;
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    status: VMStatus;
  }[];
}

export interface VMUsagePoint {
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
}

export type VmHealth = "healthy" | "idle" | "hot" | "error" | "transitioning" | "stopped";

export interface VMWithRelations extends VM {
  owner: User;
  template: VMTemplate;
  health: VmHealth;
}

export interface MachineDetail extends VMWithRelations {
  uptimeMinutes: number;
  ideUrl: string;
}

export interface FleetAttention {
  idleCount: number;
  hotCount: number;
  errorCount: number;
  possibleDailySavings: number;
}

export type TemplateInput = Pick<
  VMTemplate,
  "name" | "description" | "baseImage" | "vCpu" | "memoryGb" | "diskSizeGb" | "preinstalledTools"
>;
