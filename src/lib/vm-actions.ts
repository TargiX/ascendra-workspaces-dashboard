import type { VMLifecycleAction, VMStatus } from "../domain/types";

export type LifecycleAction = VMLifecycleAction;

export function getTransitionStatus(action: LifecycleAction): VMStatus {
  return action === "stop" ? "stopping" : "starting";
}

export function getActionBusyLabel(action: LifecycleAction | undefined, status: VMStatus) {
  if (status === "stopping" || action === "stop") return "Stopping...";
  if (action === "restart") return "Restarting...";
  if (status === "starting" || action === "start") return "Starting...";
  return "Working...";
}
