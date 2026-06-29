import type {
  FleetUtilization,
  FleetPeriod,
  MachineDetail,
  TemplateInput,
  VMTemplate,
  VMUsagePoint,
  VMWithRelations,
} from "../domain/types";

const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {}

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const workspaceApi = {
  getMachines: () => request<VMWithRelations[]>("/developer/machines"),
  getMachine: (id: string) => request<MachineDetail>(`/developer/machines/${id}`),
  getMachineMetrics: (id: string) => request<VMUsagePoint[]>(`/developer/machines/${id}/metrics`),
  startMachine: (id: string) => request<MachineDetail>(`/machines/${id}/start`, { method: "POST" }),
  stopMachine: (id: string) => request<MachineDetail>(`/machines/${id}/stop`, { method: "POST" }),
  restartMachine: (id: string) => request<MachineDetail>(`/machines/${id}/restart`, { method: "POST" }),
};

export const adminApi = {
  getFleet: (period?: FleetPeriod) => request<FleetUtilization>(period ? `/admin/fleet?period=${encodeURIComponent(period)}` : "/admin/fleet"),
  getInventory: () => request<VMWithRelations[]>("/admin/vms"),
  getTemplates: () => request<VMTemplate[]>("/admin/templates"),
  createTemplate: (input: TemplateInput) =>
    request<VMTemplate>("/admin/templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTemplate: (id: string, input: TemplateInput) =>
    request<VMTemplate>(`/admin/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTemplate: (id: string) =>
    request<{ id: string }>(`/admin/templates/${id}`, {
      method: "DELETE",
    }),
};

export const queryKeys = {
  workspaceMachines: ["workspace", "machines"] as const,
  workspaceMachine: (id: string) => ["workspace", "machines", id] as const,
  workspaceMachineMetrics: (id: string) => ["workspace", "machines", id, "metrics"] as const,
  adminFleet: ["admin", "fleet"] as const,
  adminInventory: ["admin", "vms"] as const,
  adminTemplates: ["admin", "templates"] as const,
};
