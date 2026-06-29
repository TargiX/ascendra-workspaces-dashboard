import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceApi, queryKeys } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CardSkeleton, Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatCard } from "../../components/ui/StatCard";
import { formatCurrency } from "../../lib/format";
import { MachineCard } from "./MachineCard";
import { ActivityHeart, CurrencyDollarCircle, PieChart03, Plus, SearchMd, Server01 } from "@untitledui/icons";

export function WorkspaceMachinesPage() {
  const [query, setQuery] = useState("");
  const machinesQuery = useQuery({
    queryKey: queryKeys.workspaceMachines,
    queryFn: workspaceApi.getMachines,
  });

  if (machinesQuery.isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-full sm:max-w-sm" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (machinesQuery.isError) {
    return <ErrorState onRetry={() => void machinesQuery.refetch()} />;
  }

  const machines = machinesQuery.data ?? [];
  const lowerSearch = query.trim().toLowerCase();
  const visibleMachines =
    lowerSearch.length === 0
      ? machines
      : machines.filter((machine) =>
          [
            machine.name,
            machine.status,
            machine.region,
            machine.template.name,
            machine.template.baseImage,
            ...machine.template.preinstalledTools,
          ]
            .join(" ")
            .toLowerCase()
            .includes(lowerSearch),
        );
  const runningCount = machines.filter((machine) => machine.status === "running" || machine.status === "starting").length;
  const hourlyCost = machines
    .filter((machine) => machine.status !== "stopped")
    .reduce((sum, machine) => sum + machine.hourlyCost, 0);
  const avgMemory = machines.length
    ? machines.reduce((sum, machine) => sum + machine.memoryUsagePercent, 0) / machines.length
    : 0;

  return (
    <div className="animate-fade-in">
      {machines.length > 0 ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <Input
              aria-label="Search machines"
              leadingIcon={<SearchMd className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              placeholder="Search machine, template, status..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p className="mt-1.5 text-[12px] text-gray-500 dark:text-gray-400">
              {visibleMachines.length} of {machines.length} machines visible.
            </p>
          </div>
          <Button type="button" variant="primary" aria-label="Add new machine">
            <Plus className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Add New Machine
          </Button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-in-up">
        <StatCard
          label="Machines"
          value={machines.length}
          helper="Assigned to your account"
          icon={<Server01 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        />
        <StatCard
          label="Running"
          value={runningCount}
          helper="Includes transition states"
          icon={<ActivityHeart className="size-4" strokeWidth={1.8} aria-hidden="true" />}
          iconTone="success"
        />
        <StatCard
          label="Current cost"
          value={`${formatCurrency(hourlyCost)}/hr`}
          helper="Running machines only"
          icon={<CurrencyDollarCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        />
        <StatCard
          label="Avg memory"
          value={`${Math.round(avgMemory)}%`}
          helper="Across your workspaces"
          icon={<PieChart03 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
          iconTone="brand"
        />
      </div>

      {machines.length === 0 ? (
        <EmptyState
          title="No machines yet"
          description="Your approved templates would appear here once a workspace is provisioned."
        />
      ) : visibleMachines.length === 0 ? (
        <EmptyState
          title="No machines match this search"
          description="Try another machine name, template, base image, status or installed tool."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {visibleMachines.map((machine, index) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              className={`animate-fade-in-up stagger-${Math.min(index + 1, 8)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
