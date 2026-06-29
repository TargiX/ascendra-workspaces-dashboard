import type { FleetAttention, VM, VMStatus, VMWithRelations, User, VMTemplate, VmHealth } from "../domain/types";

export function minutesSince(isoDate: string, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(isoDate).getTime()) / 60_000));
}

export function getVmHealth(vm: VM, now = new Date()): VmHealth {
  if (vm.status === "error") return "error";
  if (vm.status === "stopped") return "stopped";
  if (vm.status === "starting" || vm.status === "stopping") return "transitioning";

  const idleMinutes = minutesSince(vm.lastActiveAt, now);
  const isIdle = vm.status === "running" && vm.cpuUsagePercent < 10 && vm.memoryUsagePercent < 25 && idleMinutes > 60;
  if (isIdle) return "idle";

  const isHot = vm.cpuUsagePercent >= 85 || vm.memoryUsagePercent >= 85 || vm.diskUsagePercent >= 90;
  if (isHot) return "hot";

  return "healthy";
}

export function getStatusLabel(status: VMStatus) {
  const labels: Record<VMStatus, string> = {
    running: "Running",
    stopped: "Stopped",
    starting: "Starting",
    stopping: "Stopping",
    error: "Error",
  };

  return labels[status];
}

export function isActionLocked(status: VMStatus) {
  return status === "starting" || status === "stopping";
}

export function attachVmRelations(vms: VM[], users: User[], templates: VMTemplate[], now = new Date()): VMWithRelations[] {
  return vms.map((vm) => {
    const owner = users.find((user) => user.id === vm.ownerId);
    const template = templates.find((item) => item.id === vm.templateId);

    if (!owner || !template) {
      throw new Error(`Missing relation for VM ${vm.id}`);
    }

    return {
      ...vm,
      owner,
      template,
      health: getVmHealth(vm, now),
    };
  });
}

export function getFleetAttention(vms: VM[]): FleetAttention {
  const health = vms.map((vm) => getVmHealth(vm));
  const idleVms = vms.filter((_, index) => health[index] === "idle");

  return {
    idleCount: idleVms.length,
    hotCount: health.filter((item) => item === "hot").length,
    errorCount: health.filter((item) => item === "error").length,
    possibleDailySavings: idleVms.reduce((sum, vm) => sum + vm.hourlyCost * 24, 0),
  };
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
