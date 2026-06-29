import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DotsHorizontal, Play, RefreshCcw01, Stop, Terminal } from "@untitledui/icons";
import type { ReactNode } from "react";
import { workspaceApi, queryKeys } from "../../api/client";
import type { MachineDetail, VMWithRelations } from "../../domain/types";
import { cn } from "../../lib/cn";
import { getVmHealth, isActionLocked } from "../../lib/vm-analytics";
import { getActionBusyLabel, getTransitionStatus, type LifecycleAction } from "../../lib/vm-actions";
import { Button, ButtonLink, ButtonSpinner } from "../../components/ui/Button";
import { DropdownMenu, DropdownMenuItem } from "../../components/ui/DropdownMenu";

type MachineLike = VMWithRelations | MachineDetail;
type Action = LifecycleAction;
type ActionButtonVariant = "primary" | "secondary";
type ActionMode = "inline" | "menu";

function patchMachine<T extends MachineLike>(machine: T, patch: Partial<MachineLike>): T {
  const updated = { ...machine, ...patch };
  return {
    ...updated,
    health: getVmHealth(updated),
  } as T;
}

export function MachineActions({
  machine,
  showOpenIde = true,
  mode = "inline",
  showMenu = true,
  className,
  primaryClassName,
  primaryVariant = "primary",
  secondaryClassName,
  afterPrimary,
}: {
  machine: MachineLike;
  showOpenIde?: boolean;
  mode?: ActionMode;
  showMenu?: boolean;
  className?: string;
  primaryClassName?: string;
  primaryVariant?: ActionButtonVariant;
  secondaryClassName?: string;
  afterPrimary?: ReactNode;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action === "start") return workspaceApi.startMachine(machine.id);
      if (action === "stop") return workspaceApi.stopMachine(machine.id);
      return workspaceApi.restartMachine(machine.id);
    },
    onMutate: async (action) => {
      const status = getTransitionStatus(action);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.workspaceMachines }),
        queryClient.cancelQueries({ queryKey: queryKeys.workspaceMachine(machine.id) }),
        queryClient.cancelQueries({ queryKey: queryKeys.adminInventory }),
        queryClient.cancelQueries({ queryKey: queryKeys.adminFleet }),
      ]);

      const previousMachines = queryClient.getQueryData<VMWithRelations[]>(queryKeys.workspaceMachines);
      const previousMachine = queryClient.getQueryData<MachineDetail>(queryKeys.workspaceMachine(machine.id));
      const previousInventory = queryClient.getQueryData<VMWithRelations[]>(queryKeys.adminInventory);

      queryClient.setQueryData<VMWithRelations[]>(queryKeys.workspaceMachines, (current) =>
        current?.map((item) => (item.id === machine.id ? patchMachine(item, { lifecycleAction: action, status }) : item)),
      );
      queryClient.setQueryData<MachineDetail>(queryKeys.workspaceMachine(machine.id), (current) =>
        current ? patchMachine(current, { lifecycleAction: action, status }) : current,
      );
      queryClient.setQueryData<VMWithRelations[]>(queryKeys.adminInventory, (current) =>
        current?.map((item) => (item.id === machine.id ? patchMachine(item, { lifecycleAction: action, status }) : item)),
      );

      return { previousMachines, previousMachine, previousInventory };
    },
    onError: (_error, _action, context) => {
      queryClient.setQueryData(queryKeys.workspaceMachines, context?.previousMachines);
      queryClient.setQueryData(queryKeys.workspaceMachine(machine.id), context?.previousMachine);
      queryClient.setQueryData(queryKeys.adminInventory, context?.previousInventory);
    },
    onSuccess: (updatedMachine, action) => {
      const lifecycleAction = isActionLocked(updatedMachine.status) ? action : null;

      queryClient.setQueryData<VMWithRelations[]>(queryKeys.workspaceMachines, (current) =>
        current?.map((item) =>
          item.id === machine.id
            ? patchMachine(item, {
                lifecycleAction,
                status: updatedMachine.status,
                startedAt: updatedMachine.startedAt,
                lastActiveAt: updatedMachine.lastActiveAt,
                cpuUsagePercent: updatedMachine.cpuUsagePercent,
                memoryUsagePercent: updatedMachine.memoryUsagePercent,
                diskUsagePercent: updatedMachine.diskUsagePercent,
              })
            : item,
        ),
      );
      queryClient.setQueryData<MachineDetail>(
        queryKeys.workspaceMachine(machine.id),
        patchMachine(updatedMachine, { lifecycleAction }),
      );
      queryClient.setQueryData<VMWithRelations[]>(queryKeys.adminInventory, (current) =>
        current?.map((item) =>
          item.id === machine.id
            ? patchMachine(item, {
                lifecycleAction,
                status: updatedMachine.status,
                startedAt: updatedMachine.startedAt,
                lastActiveAt: updatedMachine.lastActiveAt,
                cpuUsagePercent: updatedMachine.cpuUsagePercent,
                memoryUsagePercent: updatedMachine.memoryUsagePercent,
                diskUsagePercent: updatedMachine.diskUsagePercent,
              })
            : item,
        ),
      );

      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMachines });
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMachine(machine.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminInventory });
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminFleet });
      }, 1650);
    },
  });

  const transitioning = isActionLocked(machine.status);
  const locked = transitioning || mutation.isPending;
  const pendingAction = mutation.isPending ? mutation.variables : (machine.lifecycleAction ?? undefined);
  const ideUrl = "ideUrl" in machine ? machine.ideUrl : `https://ide.ascendra.dev/workspaces/${machine.id}`;
  const transitionLabel = getActionBusyLabel(pendingAction, machine.status);
  const actionsMenuLabel = locked
    ? `Actions unavailable for ${machine.name}: ${transitionLabel}`
    : `Actions for ${machine.name}`;
  const canOpenIde = showOpenIde && machine.status === "running";

  const actionsMenu = (
    <DropdownMenu
      disabled={locked}
      label={actionsMenuLabel}
      triggerClassName={secondaryClassName}
      trigger={
        locked ? (
          <ButtonSpinner className="size-4" />
        ) : (
          <DotsHorizontal className="size-4" strokeWidth={1.8} aria-hidden="true" />
        )
      }
    >
      {canOpenIde ? (
        <DropdownMenuItem onSelect={() => window.open(ideUrl, "_blank", "noreferrer")}>
          <Terminal className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Open in IDE
        </DropdownMenuItem>
      ) : null}
      {!locked && machine.status === "stopped" ? (
        <DropdownMenuItem onSelect={() => mutation.mutate("start")}>
          <Play className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Start
        </DropdownMenuItem>
      ) : null}
      {!locked && machine.status === "error" ? (
        <DropdownMenuItem onSelect={() => mutation.mutate("restart")}>
          <RefreshCcw01 className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Restart
        </DropdownMenuItem>
      ) : null}
      {!locked && machine.status === "running" ? (
        <>
          <DropdownMenuItem onSelect={() => mutation.mutate("restart")}>
            <RefreshCcw01 className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Restart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => mutation.mutate("stop")} tone="danger">
            <Stop className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Stop
          </DropdownMenuItem>
        </>
      ) : null}
      {locked ? <DropdownMenuItem disabled>{transitionLabel}</DropdownMenuItem> : null}
    </DropdownMenu>
  );

  if (mode === "menu") {
    return <div className={cn("flex items-center", className)}>{actionsMenu}</div>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {locked ? (
        <Button
          size="sm"
          variant="secondary"
          className={primaryClassName}
          loading={transitioning || mutation.isPending}
          disabled
          aria-label={`${transitionLabel} ${machine.name}`}
        >
          {transitionLabel}
        </Button>
      ) : null}

      {!locked && canOpenIde ? (
        <ButtonLink
          href={ideUrl}
          target="_blank"
          rel="noreferrer"
          size="sm"
          variant={primaryVariant}
          className={primaryClassName}
          aria-label={`Open ${machine.name} in IDE`}
        >
          <Terminal className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          Open in IDE
        </ButtonLink>
      ) : null}

      {!locked && machine.status === "stopped" ? (
        <Button
          size="sm"
          variant={primaryVariant}
          className={primaryClassName}
          loading={mutation.isPending}
          onClick={() => mutation.mutate("start")}
          aria-label={`Start ${machine.name}`}
        >
          <Play className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          Start
        </Button>
      ) : null}

      {!locked && machine.status === "error" ? (
        <Button
          size="sm"
          variant={primaryVariant}
          className={primaryClassName}
          loading={mutation.isPending}
          onClick={() => mutation.mutate("restart")}
          aria-label={`Restart ${machine.name}`}
        >
          <RefreshCcw01 className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          Restart
        </Button>
      ) : null}

      {afterPrimary}

      {showMenu && !locked && machine.status === "running" ? actionsMenu : null}
    </div>
  );
}
