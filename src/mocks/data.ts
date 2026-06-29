import type { FleetPeriod, FleetUtilization, User, VM, VMTemplate, VMUsagePoint } from "../domain/types";
import { average } from "../lib/vm-analytics";

export const currentEngineerId = "usr_102";

const now = Date.now();
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();

export const seedUsers: User[] = [
  {
    id: "usr_101",
    name: "Avery Stone",
    email: "avery@ascendra.dev",
    role: "admin",
    team: "DevEx",
    vmCount: 0,
  },
  {
    id: "usr_102",
    name: "Maya Chen",
    email: "maya@ascendra.dev",
    role: "engineer",
    team: "Platform Apps",
    vmCount: 0,
  },
  {
    id: "usr_103",
    name: "Noah Patel",
    email: "noah@ascendra.dev",
    role: "engineer",
    team: "AI Infra",
    vmCount: 0,
  },
  {
    id: "usr_104",
    name: "Elena Garcia",
    email: "elena@ascendra.dev",
    role: "engineer",
    team: "Payments",
    vmCount: 0,
  },
  {
    id: "usr_105",
    name: "Jonas Meyer",
    email: "jonas@ascendra.dev",
    role: "engineer",
    team: "Data Platform",
    vmCount: 0,
  },
  {
    id: "usr_106",
    name: "Priya Nair",
    email: "priya@ascendra.dev",
    role: "engineer",
    team: "Mobile",
    vmCount: 0,
  },
  {
    id: "usr_107",
    name: "Sam Wilson",
    email: "sam@ascendra.dev",
    role: "engineer",
    team: "Developer Tools",
    vmCount: 0,
  },
];

export const seedTemplates: VMTemplate[] = [
  {
    id: "tpl_node_large",
    name: "Node + Docker Large",
    description: "Full-stack web development image with Docker, Node.js, pnpm and vscode-server.",
    baseImage: "ubuntu-22.04",
    vCpu: 8,
    memoryGb: 16,
    diskSizeGb: 120,
    preinstalledTools: ["vscode-server", "docker", "node", "pnpm"],
  },
  {
    id: "tpl_go_medium",
    name: "Go Services Medium",
    description: "Lean backend image for Go services with common debugging and profiling tools.",
    baseImage: "ubuntu-24.04",
    vCpu: 4,
    memoryGb: 8,
    diskSizeGb: 80,
    preinstalledTools: ["vscode-server", "go", "docker", "delve"],
  },
  {
    id: "tpl_ml_xlarge",
    name: "ML Notebook XLarge",
    description: "Python and CUDA-ready workspace for model prototyping and notebooks.",
    baseImage: "ubuntu-22.04-cuda",
    vCpu: 16,
    memoryGb: 64,
    diskSizeGb: 240,
    preinstalledTools: ["vscode-server", "python", "jupyter", "cuda"],
  },
  {
    id: "tpl_mobile_small",
    name: "Mobile Build Small",
    description: "Android and React Native image for lightweight mobile builds.",
    baseImage: "ubuntu-22.04",
    vCpu: 4,
    memoryGb: 12,
    diskSizeGb: 100,
    preinstalledTools: ["vscode-server", "android-sdk", "node", "java"],
  },
  {
    id: "tpl_data_large",
    name: "Data Engineering Large",
    description: "Data engineering workspace with Python, Spark CLI and database clients.",
    baseImage: "ubuntu-24.04",
    vCpu: 8,
    memoryGb: 32,
    diskSizeGb: 160,
    preinstalledTools: ["vscode-server", "python", "spark", "postgres-client"],
  },
];

export const seedVms: VM[] = [
  {
    id: "vm_1001",
    name: "frontend-dev-main",
    ownerId: "usr_102",
    templateId: "tpl_node_large",
    status: "running",
    region: "us-east-1",
    createdAt: hoursAgo(250),
    startedAt: hoursAgo(5),
    lastActiveAt: minutesAgo(8),
    cpuUsagePercent: 42,
    memoryUsagePercent: 68,
    diskUsagePercent: 54,
    hourlyCost: 0.64,
  },
  {
    id: "vm_1002",
    name: "api-debug-sandbox",
    ownerId: "usr_102",
    templateId: "tpl_go_medium",
    status: "stopped",
    region: "eu-west-1",
    createdAt: hoursAgo(120),
    startedAt: null,
    lastActiveAt: hoursAgo(32),
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    diskUsagePercent: 41,
    hourlyCost: 0.28,
  },
  {
    id: "vm_1003",
    name: "feature-branch-vscode",
    ownerId: "usr_102",
    templateId: "tpl_node_large",
    status: "running",
    region: "us-east-1",
    createdAt: hoursAgo(18),
    startedAt: hoursAgo(2),
    lastActiveAt: minutesAgo(3),
    cpuUsagePercent: 18,
    memoryUsagePercent: 24,
    diskUsagePercent: 39,
    hourlyCost: 0.64,
  },
  {
    id: "vm_1004",
    name: "llm-eval-runner",
    ownerId: "usr_103",
    templateId: "tpl_ml_xlarge",
    status: "running",
    region: "us-west-2",
    createdAt: hoursAgo(96),
    startedAt: hoursAgo(9),
    lastActiveAt: minutesAgo(4),
    cpuUsagePercent: 92,
    memoryUsagePercent: 87,
    diskUsagePercent: 72,
    hourlyCost: 2.2,
  },
  {
    id: "vm_1005",
    name: "payments-api-local",
    ownerId: "usr_104",
    templateId: "tpl_go_medium",
    status: "running",
    region: "eu-west-1",
    createdAt: hoursAgo(188),
    startedAt: hoursAgo(11),
    lastActiveAt: hoursAgo(3),
    cpuUsagePercent: 4,
    memoryUsagePercent: 16,
    diskUsagePercent: 48,
    hourlyCost: 0.28,
  },
  {
    id: "vm_1006",
    name: "spark-etl-pipeline",
    ownerId: "usr_105",
    templateId: "tpl_data_large",
    status: "running",
    region: "us-east-1",
    createdAt: hoursAgo(420),
    startedAt: hoursAgo(14),
    lastActiveAt: minutesAgo(45),
    cpuUsagePercent: 63,
    memoryUsagePercent: 71,
    diskUsagePercent: 84,
    hourlyCost: 1.12,
  },
  {
    id: "vm_1007",
    name: "mobile-android-build",
    ownerId: "usr_106",
    templateId: "tpl_mobile_small",
    status: "error",
    region: "ap-southeast-1",
    createdAt: hoursAgo(81),
    startedAt: hoursAgo(4),
    lastActiveAt: hoursAgo(2),
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    diskUsagePercent: 67,
    hourlyCost: 0.36,
  },
  {
    id: "vm_1008",
    name: "storybook-review-box",
    ownerId: "usr_107",
    templateId: "tpl_node_large",
    status: "running",
    region: "us-east-1",
    createdAt: hoursAgo(64),
    startedAt: hoursAgo(18),
    lastActiveAt: hoursAgo(7),
    cpuUsagePercent: 6,
    memoryUsagePercent: 19,
    diskUsagePercent: 45,
    hourlyCost: 0.64,
  },
  {
    id: "vm_1009",
    name: "data-contract-tests",
    ownerId: "usr_105",
    templateId: "tpl_data_large",
    status: "running",
    region: "eu-central-1",
    createdAt: hoursAgo(58),
    startedAt: hoursAgo(1),
    lastActiveAt: minutesAgo(12),
    cpuUsagePercent: 54,
    memoryUsagePercent: 44,
    diskUsagePercent: 57,
    hourlyCost: 1.12,
  },
  {
    id: "vm_1010",
    name: "go-api-observability",
    ownerId: "usr_103",
    templateId: "tpl_go_medium",
    status: "stopping",
    region: "us-west-2",
    createdAt: hoursAgo(38),
    startedAt: hoursAgo(6),
    lastActiveAt: minutesAgo(24),
    cpuUsagePercent: 12,
    memoryUsagePercent: 21,
    diskUsagePercent: 36,
    hourlyCost: 0.28,
  },
  {
    id: "vm_1011",
    name: "checkout-ui-vscode",
    ownerId: "usr_104",
    templateId: "tpl_node_large",
    status: "running",
    region: "eu-west-1",
    createdAt: hoursAgo(144),
    startedAt: hoursAgo(4),
    lastActiveAt: minutesAgo(5),
    cpuUsagePercent: 71,
    memoryUsagePercent: 82,
    diskUsagePercent: 65,
    hourlyCost: 0.64,
  },
  {
    id: "vm_1012",
    name: "notebook-drift-analysis",
    ownerId: "usr_103",
    templateId: "tpl_ml_xlarge",
    status: "stopped",
    region: "us-west-2",
    createdAt: hoursAgo(380),
    startedAt: null,
    lastActiveAt: hoursAgo(72),
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    diskUsagePercent: 79,
    hourlyCost: 2.2,
  },
];

export function buildUserVmCounts(users: User[], vms: VM[]) {
  return users.map((user) => ({
    ...user,
    vmCount: vms.filter((vm) => vm.ownerId === user.id).length,
  }));
}

function seededWave(index: number, phase: number, base: number, spread: number) {
  const raw = base + Math.sin(index / 2.4 + phase) * spread + Math.cos(index / 4.2 + phase) * (spread / 2);
  return Math.max(2, Math.min(98, Math.round(raw)));
}

export function makeVmTrend(vm: VM): VMUsagePoint[] {
  return Array.from({ length: 24 }, (_, index) => {
    const timestamp = new Date(now - (23 - index) * 60 * 60 * 1000).toISOString();
    const phase = Number(vm.id.replace("vm_", "")) / 100;

    if (vm.status === "stopped") {
      return {
        timestamp,
        cpuPercent: 0,
        memoryPercent: 0,
        diskPercent: vm.diskUsagePercent,
      };
    }

    return {
      timestamp,
      cpuPercent: seededWave(index, phase, Math.max(vm.cpuUsagePercent, 12), 14),
      memoryPercent: seededWave(index, phase + 1.2, Math.max(vm.memoryUsagePercent, 18), 10),
      diskPercent: Math.max(5, Math.min(98, Math.round(vm.diskUsagePercent + Math.sin(index / 5 + phase) * 2))),
    };
  });
}

function getFleetTrendConfig(period: FleetPeriod) {
  if (period === "7d") return { count: 28, stepHours: 6, cpuBase: 44, memoryBase: 57, spread: 15, phase: 0.9 };
  if (period === "30d") return { count: 30, stepHours: 24, cpuBase: 42, memoryBase: 55, spread: 18, phase: 1.4 };
  return { count: 24, stepHours: 1, cpuBase: 46, memoryBase: 59, spread: 12, phase: 0.4 };
}

function getFleetPeriodLabel(period: FleetPeriod) {
  if (period === "7d") return "last-7-days";
  if (period === "30d") return "last-30-days";
  return "last-24-hours";
}

export function makeFleetTrend(vms: VM[], period: FleetPeriod = "24h"): FleetUtilization["utilizationTrend"] {
  const { count, stepHours, cpuBase, memoryBase, spread, phase } = getFleetTrendConfig(period);
  const runningLikeCount = vms.filter((vm) => vm.status === "running" || vm.status === "starting" || vm.status === "stopping").length;

  return Array.from({ length: count }, (_, index) => {
    const runningVms = Math.max(
      0,
      Math.min(vms.length, Math.round(runningLikeCount + Math.sin(index / 3) * 2 + Math.cos(index / 4 + phase))),
    );

    return {
      timestamp: new Date(now - (count - 1 - index) * stepHours * 60 * 60 * 1000).toISOString(),
      cpuPercent: seededWave(index, phase, cpuBase, spread),
      memoryPercent: seededWave(index, phase + 0.7, memoryBase, spread - 2),
      runningVms,
    };
  });
}

export function computeFleet(vms: VM[], users: User[], period: FleetPeriod = "24h"): FleetUtilization {
  const runningLike = vms.filter((vm) => vm.status === "running" || vm.status === "starting" || vm.status === "stopping");
  const trend = makeFleetTrend(vms, period);
  const totalHourlyCost = runningLike.reduce((sum, vm) => sum + vm.hourlyCost, 0);

  return {
    period: getFleetPeriodLabel(period),
    totalVms: vms.length,
    runningVms: runningLike.length,
    stoppedVms: vms.filter((vm) => vm.status === "stopped").length,
    totalUsers: users.filter((user) => user.role === "engineer").length,
    avgCpuUtilizationPercent: average(trend.map((point) => point.cpuPercent)),
    peakCpuUtilizationPercent: Math.max(...trend.map((point) => point.cpuPercent)),
    avgMemoryUtilizationPercent: average(trend.map((point) => point.memoryPercent)),
    peakMemoryUtilizationPercent: Math.max(...trend.map((point) => point.memoryPercent)),
    totalHourlyCost,
    monthToDateCost: totalHourlyCost * 24 * 12 + 1820,
    projectedMonthlyCost: totalHourlyCost * 24 * 30,
    utilizationTrend: trend,
    vmMetrics: vms.map((vm) => ({
      vmId: vm.id,
      cpuPercent: vm.cpuUsagePercent,
      memoryPercent: vm.memoryUsagePercent,
      diskPercent: vm.diskUsagePercent,
      status: vm.status,
    })),
  };
}
