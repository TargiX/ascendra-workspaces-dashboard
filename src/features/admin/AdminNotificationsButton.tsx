import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell01, BellRinging01, ChevronRight, XClose } from "@untitledui/icons";
import { adminApi, queryKeys } from "../../api/client";
import { useAdminRefresh } from "../../app/AdminRefreshContext";
import { Button, buttonClassName } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/cn";
import { formatCurrency, formatPercent, relativeTime } from "../../lib/format";
import type { VMWithRelations, VmHealth } from "../../domain/types";
import { HealthBadge } from "../shared/StatusBadge";
import { dispatchOpenAdminVm } from "./adminEvents";

type AttentionKind = Extract<VmHealth, "idle" | "hot" | "error">;

type Notification = {
  kind: AttentionKind;
  vm: VMWithRelations;
};

const cardClasses: Record<AttentionKind, string> = {
  idle: "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10",
  hot: "border-orange-200 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/10",
  error: "border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10",
};

export function AdminNotificationsButton() {
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const { refetchInterval } = useAdminRefresh();

  const inventoryQuery = useQuery({
    queryKey: queryKeys.adminInventory,
    queryFn: adminApi.getInventory,
    refetchInterval,
  });

  const notifications = useMemo(() => {
    const rows = inventoryQuery.data ?? [];
    return rows
      .filter((vm): vm is VMWithRelations & { health: AttentionKind } => vm.health === "idle" || vm.health === "hot" || vm.health === "error")
      .filter((vm) => !dismissedIds.has(vm.id))
      .map((vm) => ({ kind: vm.health, vm }))
      .sort((a, b) => notificationPriority(b.kind) - notificationPriority(a.kind) || b.vm.hourlyCost - a.vm.hourlyCost);
  }, [dismissedIds, inventoryQuery.data]);

  const total = notifications.length;
  const Icon = total > 0 ? BellRinging01 : Bell01;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        {total > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-gray-950 px-1 text-[10px] font-semibold leading-4 text-white dark:bg-gray-100 dark:text-gray-950">
            {total}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white sm:w-[380px] dark:border-white/10 dark:bg-[#111]"
          data-testid="admin-notification-popover"
        >
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Fleet attention</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {total > 0 ? `${total} active notifications` : "No active notifications"}
              </p>
            </div>
            <Badge tone={total > 0 ? "warning" : "success"}>{total}</Badge>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
            {total === 0 ? (
              <p className="px-2 py-6 text-center text-[13px] text-gray-500 dark:text-gray-400">
                Fleet looks quiet right now.
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.vm.id}
                    notification={notification}
                    onDismiss={(id) => setDismissedIds((current) => new Set(current).add(id))}
                    onOpen={(id) => {
                      dispatchOpenAdminVm(id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-2 dark:border-white/10">
            <Link
              to="/admin/vms"
              className={cn(buttonClassName({ variant: "secondary", size: "md" }), "w-full")}
              onClick={() => setOpen(false)}
            >
              Open VM inventory
              <ChevronRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { kind, vm } = notification;
  const detail =
    kind === "idle"
      ? `Low activity ${relativeTime(vm.lastActiveAt)} · ${formatCurrency(vm.hourlyCost * 24)}/day`
      : kind === "hot"
        ? `${formatPercent(vm.cpuUsagePercent)} CPU · ${formatPercent(vm.memoryUsagePercent)} memory`
        : "Lifecycle failure";

  return (
    <article
      className={cn("cursor-pointer rounded-md border px-3 py-2.5 transition-colors hover:border-gray-300 dark:hover:border-white/20", cardClasses[kind])}
      data-testid={`admin-notification-card-${vm.id}`}
      onClick={() => onOpen(vm.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100">{vm.name}</p>
            <HealthBadge health={kind} />
          </div>
          <p className="mt-1 truncate text-xs text-gray-600 dark:text-gray-400">{vm.owner.name} · {detail}</p>
        </div>
        <button
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-white/70 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(vm.id);
          }}
          aria-label={`Dismiss ${vm.name}`}
        >
          <XClose className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
        <span>{vm.template.name}</span>
        <span className="tabular-nums">{formatCurrency(vm.hourlyCost)}/hr</span>
      </div>
    </article>
  );
}

function notificationPriority(kind: AttentionKind) {
  const priority: Record<AttentionKind, number> = {
    error: 3,
    hot: 2,
    idle: 1,
  };

  return priority[kind];
}
