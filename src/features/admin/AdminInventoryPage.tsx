import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, SearchMd } from "@untitledui/icons";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { adminApi, queryKeys } from "../../api/client";
import type { VMStatus, VMWithRelations, VmHealth } from "../../domain/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { buttonClassName } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency, formatPercent, relativeTime } from "../../lib/format";
import { StatusBadge, HealthBadge } from "../shared/StatusBadge";
import { cn } from "../../lib/cn";
import { useGlobalSearch } from "../../app/SearchContext";

type InventoryQuickFilter = "all" | "attention" | "running" | "stopped" | "transitioning" | "healthy" | "idle" | "hot" | "error";

export function AdminInventoryPage() {
  const { query, setQuery } = useGlobalSearch();
  const [quickFilter, setQuickFilter] = useState<InventoryQuickFilter>("all");
  const [owner, setOwner] = useState("all");
  const [template, setTemplate] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "cpu", desc: true }]);

  const inventoryQuery = useQuery({
    queryKey: queryKeys.adminInventory,
    queryFn: adminApi.getInventory,
  });

  const inventory = inventoryQuery.data ?? [];

  const owners = useMemo(() => {
    const unique = new Map<string, string>();
    inventory.forEach((vm) => unique.set(vm.owner.id, vm.owner.name));
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [inventory]);

  const templates = useMemo(() => {
    const unique = new Map<string, string>();
    inventory.forEach((vm) => unique.set(vm.template.id, vm.template.name));
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [inventory]);

  const quickCounts = useMemo(
    () => ({
      all: inventory.length,
      attention: inventory.filter((vm) => vm.health === "idle" || vm.health === "hot" || vm.health === "error").length,
      running: inventory.filter((vm) => vm.status === "running").length,
      stopped: inventory.filter((vm) => vm.status === "stopped").length,
      transitioning: inventory.filter((vm) => vm.status === "starting" || vm.status === "stopping").length,
      healthy: inventory.filter((vm) => vm.health === "healthy").length,
      idle: inventory.filter((vm) => vm.health === "idle").length,
      hot: inventory.filter((vm) => vm.health === "hot").length,
      error: inventory.filter((vm) => vm.status === "error" || vm.health === "error").length,
    }),
    [inventory],
  );

  const data = useMemo(() => {
    const searchTokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return inventory.filter((vm) => {
      const searchable = [
        vm.name,
        vm.owner.name,
        vm.owner.email,
        vm.owner.team,
        vm.template.name,
        vm.template.baseImage,
        vm.region,
        vm.status,
        vm.health,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = searchTokens.length === 0 || searchTokens.every((token) => searchable.includes(token));
      const matchesQuickFilter = matchesInventoryQuickFilter(vm, quickFilter);
      const matchesOwner = owner === "all" || vm.owner.id === owner;
      const matchesTemplate = template === "all" || vm.template.id === template;

      return matchesQuery && matchesQuickFilter && matchesOwner && matchesTemplate;
    });
  }, [inventory, owner, query, quickFilter, template]);

  const columns = useMemo<ColumnDef<VMWithRelations>[]>(
    () => [
      {
        id: "name",
        header: "VM",
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{row.original.name}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{row.original.region}</p>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        accessorFn: (row) => row.owner.name,
        cell: ({ row }) => (
          <button
            className="block rounded text-left hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:hover:text-gray-100 dark:focus-visible:ring-white/10"
            onClick={() => setOwner(row.original.owner.id)}
            type="button"
            aria-label={`Filter by owner ${row.original.owner.name}`}
          >
            <span className="block font-medium text-gray-700 dark:text-gray-300">{row.original.owner.name}</span>
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{row.original.owner.team}</span>
          </button>
        ),
      },
      {
        id: "template",
        header: "Template",
        accessorFn: (row) => row.template.name,
        cell: ({ row }) => (
          <button
            className="max-w-40 rounded text-left text-gray-700 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-white/10"
            onClick={() => setTemplate(row.original.template.id)}
            type="button"
            aria-label={`Filter by template ${row.original.template.name}`}
          >
            {row.original.template.name}
          </button>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <button
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:focus-visible:ring-white/10"
            onClick={() => setQuickFilter(statusToQuickFilter(row.original.status))}
            type="button"
            aria-label={`Filter by status ${row.original.status}`}
          >
            <StatusBadge status={row.original.status} />
          </button>
        ),
      },
      {
        id: "health",
        header: "Signal",
        accessorKey: "health",
        cell: ({ row }) => (
          <button
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:focus-visible:ring-white/10"
            onClick={() => setQuickFilter(healthToQuickFilter(row.original.health))}
            type="button"
            aria-label={`Filter by signal ${row.original.health}`}
          >
            <HealthBadge health={row.original.health} />
          </button>
        ),
      },
      {
        id: "cpu",
        header: "CPU",
        accessorKey: "cpuUsagePercent",
        cell: ({ row }) => <UtilizationCell value={row.original.cpuUsagePercent} />,
      },
      {
        id: "memory",
        header: "Memory",
        accessorKey: "memoryUsagePercent",
        cell: ({ row }) => <UtilizationCell value={row.original.memoryUsagePercent} />,
      },
      {
        id: "disk",
        header: "Disk",
        accessorKey: "diskUsagePercent",
        cell: ({ row }) => <UtilizationCell value={row.original.diskUsagePercent} />,
      },
      {
        id: "lastActive",
        header: "Last active",
        accessorKey: "lastActiveAt",
        cell: ({ row }) => (
          <div>
            <span className="text-gray-600 dark:text-gray-400">{relativeTime(row.original.lastActiveAt)}</span>
            {row.original.health === "idle" ? (
              <p className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-500">Idle</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "cost",
        header: "Cost",
        accessorKey: "hourlyCost",
        cell: ({ row }) => <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(row.original.hourlyCost)}/hr</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (inventoryQuery.isLoading) {
    return <Skeleton className="h-[640px] rounded-lg" />;
  }

  if (inventoryQuery.isError) {
    return <ErrorState onRetry={() => void inventoryQuery.refetch()} />;
  }

  return (
    <div className="animate-fade-in">
      <Link to="/admin/fleet" className={buttonClassName({ variant: "ghost", size: "sm", className: "-ml-2 mb-3" })}>
        <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
        Back to fleet
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <CardTitle>All machines</CardTitle>
              <CardDescription>{data.length} of {inventoryQuery.data?.length ?? 0} VMs visible after filters.</CardDescription>
            </div>
            <InventoryQuickFilters activeFilter={quickFilter} counts={quickCounts} onChange={setQuickFilter} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_220px]">
            <Input
              aria-label="Search inventory"
              leadingIcon={<SearchMd className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              placeholder="Search VM, owner, template..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Owner filter">
              <option value="all">All owners</option>
              {owners.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
            <Select value={template} onChange={(event) => setTemplate(event.target.value)} aria-label="Template filter">
              <option value="all">All templates</option>
              {templates.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </Select>
          </div>
        </CardHeader>

        {data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No VMs match these filters" description="Try clearing the view, owner, template or search filters." />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-[1180px] w-full divide-y divide-gray-200 text-[13px] dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn("px-4 py-3", header.column.id === "lastActive" && "w-[132px] min-w-[132px] whitespace-nowrap")}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            className={cn(
                              "inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200",
                              header.column.id === "lastActive" && "whitespace-nowrap",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="text-gray-400 dark:text-gray-500">
                              {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? ""}
                            </span>
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-transparent">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-white/5",
                      row.original.health === "idle" && "bg-amber-50/50 dark:bg-amber-500/5",
                      row.original.health === "hot" && "bg-orange-50/50 dark:bg-orange-500/5",
                      row.original.health === "error" && "bg-red-50/50 dark:bg-red-500/5",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn("px-4 py-3 align-middle", cell.column.id === "lastActive" && "w-[132px] min-w-[132px] whitespace-nowrap")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function InventoryQuickFilters({
  activeFilter,
  counts,
  onChange,
}: {
  activeFilter: InventoryQuickFilter;
  counts: Record<InventoryQuickFilter, number>;
  onChange: (filter: InventoryQuickFilter) => void;
}) {
  const filters: { id: InventoryQuickFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "attention", label: "Needs attention" },
    { id: "running", label: "Running" },
    { id: "stopped", label: "Stopped" },
    { id: "transitioning", label: "Transitioning" },
    { id: "healthy", label: "Healthy" },
    { id: "idle", label: "Idle" },
    { id: "hot", label: "Hot" },
    { id: "error", label: "Error" },
  ];

  return (
    <>
      <div className="md:hidden">
        <Select value={activeFilter} onChange={(event) => onChange(event.target.value as InventoryQuickFilter)} aria-label="View filter">
          {filters.map((filter) => (
            <option key={filter.id} value={filter.id}>
              {filter.label} {counts[filter.id]}
            </option>
          ))}
        </Select>
      </div>
      <div className="hidden flex-wrap gap-2 md:flex xl:max-w-[820px] xl:justify-end" role="group" aria-label="Inventory quick filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
              activeFilter === filter.id
                ? "border-gray-950 bg-gray-950 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-[#111] dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-100",
            )}
            onClick={() => onChange(filter.id)}
            aria-pressed={activeFilter === filter.id}
            aria-label={`${filter.label} ${counts[filter.id]}`}
          >
            {filter.label}
            <span className="tabular-nums opacity-70">{counts[filter.id]}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function matchesInventoryQuickFilter(vm: VMWithRelations, filter: InventoryQuickFilter) {
  if (filter === "all") return true;
  if (filter === "attention") return vm.health === "idle" || vm.health === "hot" || vm.health === "error";
  if (filter === "transitioning") return vm.status === "starting" || vm.status === "stopping";
  if (filter === "healthy" || filter === "idle" || filter === "hot") return vm.health === filter;
  if (filter === "error") return vm.status === "error" || vm.health === "error";
  if (filter === "running" || filter === "stopped") return vm.status === filter;
  return true;
}

function healthToQuickFilter(health: VmHealth): InventoryQuickFilter {
  if (health === "transitioning") return "transitioning";
  if (health === "stopped") return "stopped";
  return health;
}

function statusToQuickFilter(status: VMStatus): InventoryQuickFilter {
  if (status === "starting" || status === "stopping") return "transitioning";
  return status;
}

function UtilizationCell({ value }: { value: number }) {
  return (
    <div className="flex min-w-32 items-center gap-3">
      <ProgressBar value={value} className="min-w-20 flex-1" />
      <span className="w-10 text-right font-medium tabular-nums text-gray-700 dark:text-gray-300">
        {formatPercent(value)}
      </span>
    </div>
  );
}
