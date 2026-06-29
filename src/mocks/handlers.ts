import { delay, http, HttpResponse } from "msw";
import type { FleetPeriod, MachineDetail, TemplateInput, VM, VMStatus, VMTemplate } from "../domain/types";
import {
  buildUserVmCounts,
  computeFleet,
  currentEngineerId,
  makeVmTrend,
  seedTemplates,
  seedUsers,
  seedVms,
} from "./data";
import { attachVmRelations } from "../lib/vm-analytics";

let vms: VM[] = structuredClone(seedVms);
let templates: VMTemplate[] = structuredClone(seedTemplates);
const transitionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function users() {
  return buildUserVmCounts(seedUsers, vms);
}

function withRelations() {
  return attachVmRelations(vms, users(), templates);
}

function getMachineDetail(id: string): MachineDetail | null {
  const vm = withRelations().find((item) => item.id === id);
  if (!vm) return null;

  const uptimeMinutes = vm.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(vm.startedAt).getTime()) / 60_000))
    : 0;

  return {
    ...vm,
    uptimeMinutes,
    ideUrl: `https://ide.ascendra.dev/workspaces/${vm.id}`,
  };
}

function scheduleTransition(vm: VM, nextStatus: VMStatus, ms = 1400) {
  const existingTimer = transitionTimers.get(vm.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    vms = vms.map((item) =>
      item.id === vm.id
        ? {
            ...item,
            status: nextStatus,
            startedAt: nextStatus === "running" ? new Date().toISOString() : item.startedAt,
            lastActiveAt: new Date().toISOString(),
            cpuUsagePercent: nextStatus === "running" ? Math.max(item.cpuUsagePercent, 18) : 0,
            memoryUsagePercent: nextStatus === "running" ? Math.max(item.memoryUsagePercent, 24) : 0,
        }
        : item,
    );
    transitionTimers.delete(vm.id);
  }, ms);

  transitionTimers.set(vm.id, timer);
}

function transitionMachine(id: string, transitionStatus: VMStatus, finalStatus: VMStatus) {
  const vm = vms.find((item) => item.id === id);

  if (!vm) {
    return HttpResponse.json({ message: "Machine not found." }, { status: 404 });
  }

  vms = vms.map((item) =>
    item.id === id
      ? {
          ...item,
          status: transitionStatus,
          startedAt: transitionStatus === "starting" ? new Date().toISOString() : item.startedAt,
          lastActiveAt: new Date().toISOString(),
        }
      : item,
  );

  const updated = vms.find((item) => item.id === id)!;
  scheduleTransition(updated, finalStatus);

  return HttpResponse.json(getMachineDetail(id));
}

function parseTemplateInput(input: TemplateInput): TemplateInput {
  return {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    baseImage: input.baseImage.trim(),
    vCpu: Number(input.vCpu),
    memoryGb: Number(input.memoryGb),
    diskSizeGb: Number(input.diskSizeGb),
    preinstalledTools: input.preinstalledTools.map((tool) => tool.trim()).filter(Boolean),
  };
}

function parseFleetPeriod(value: string | null): FleetPeriod {
  if (value === "7d" || value === "30d") return value;
  return "24h";
}

export const handlers = [
  http.get("/api/developer/machines", async () => {
    await delay(420);
    return HttpResponse.json(withRelations().filter((vm) => vm.ownerId === currentEngineerId));
  }),

  http.get("/api/developer/machines/:id", async ({ params }) => {
    await delay(360);
    const machine = getMachineDetail(String(params.id));

    if (!machine || machine.ownerId !== currentEngineerId) {
      return HttpResponse.json({ message: "Machine not found." }, { status: 404 });
    }

    return HttpResponse.json(machine);
  }),

  http.get("/api/developer/machines/:id/metrics", async ({ params }) => {
    await delay(320);
    const vm = vms.find((item) => item.id === String(params.id));

    if (!vm || vm.ownerId !== currentEngineerId) {
      return HttpResponse.json({ message: "Metrics not found." }, { status: 404 });
    }

    return HttpResponse.json(makeVmTrend(vm));
  }),

  http.post("/api/machines/:id/start", async ({ params }) => {
    await delay(520);
    return transitionMachine(String(params.id), "starting", "running");
  }),

  http.post("/api/machines/:id/stop", async ({ params }) => {
    await delay(520);
    return transitionMachine(String(params.id), "stopping", "stopped");
  }),

  http.post("/api/machines/:id/restart", async ({ params }) => {
    await delay(620);
    return transitionMachine(String(params.id), "starting", "running");
  }),

  http.get("/api/admin/fleet", async ({ request }) => {
    await delay(520);
    const period = parseFleetPeriod(new URL(request.url).searchParams.get("period"));
    return HttpResponse.json(computeFleet(vms, users(), period));
  }),

  http.get("/api/admin/vms", async () => {
    await delay(520);
    return HttpResponse.json(withRelations());
  }),

  http.get("/api/admin/templates", async () => {
    await delay(380);
    return HttpResponse.json(templates);
  }),

  http.post("/api/admin/templates", async ({ request }) => {
    await delay(650);
    const payload = parseTemplateInput((await request.json()) as TemplateInput);

    const template: VMTemplate = {
      id: `tpl_custom_${Date.now()}`,
      ...payload,
    };

    templates = [template, ...templates];
    return HttpResponse.json(template, { status: 201 });
  }),

  http.patch("/api/admin/templates/:id", async ({ params, request }) => {
    await delay(650);
    const id = String(params.id);
    const payload = parseTemplateInput((await request.json()) as TemplateInput);

    const existing = templates.find((template) => template.id === id);
    if (!existing) {
      return HttpResponse.json({ message: "Template not found." }, { status: 404 });
    }

    templates = templates.map((template) => (template.id === id ? { ...template, ...payload } : template));
    return HttpResponse.json(templates.find((template) => template.id === id));
  }),

  http.delete("/api/admin/templates/:id", async ({ params }) => {
    await delay(520);
    const id = String(params.id);
    const existing = templates.find((template) => template.id === id);

    if (!existing) {
      return HttpResponse.json({ message: "Template not found." }, { status: 404 });
    }

    if (!id.startsWith("tpl_custom_")) {
      return HttpResponse.json({ message: "System templates cannot be deleted." }, { status: 409 });
    }

    const usageCount = vms.filter((vm) => vm.templateId === id).length;
    if (usageCount > 0) {
      return HttpResponse.json({ message: "Templates with active VMs cannot be deleted." }, { status: 409 });
    }

    templates = templates.filter((template) => template.id !== id);
    return HttpResponse.json({ id });
  }),
];
