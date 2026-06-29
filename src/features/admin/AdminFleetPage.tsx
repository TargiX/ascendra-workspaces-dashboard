import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  DotsHorizontal,
  Eye,
  LinkExternal01,
  Play,
  Plus,
  RefreshCcw01,
  RefreshCw01,
  SearchMd,
  Stop,
  Terminal,
  X,
} from "@untitledui/icons";
import { adminApi, queryKeys, workspaceApi } from "../../api/client";
import { useAdminRefresh } from "../../app/AdminRefreshContext";
import { Badge } from "../../components/ui/Badge";
import {
  Button,
  ButtonLink,
  buttonClassName,
} from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Drawer } from "../../components/ui/Drawer";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "../../components/ui/DropdownMenu";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import type {
  FleetPeriod,
  VMStatus,
  VMWithRelations,
  VmHealth,
} from "../../domain/types";
import { cn } from "../../lib/cn";
import {
  formatCurrency,
  formatDuration,
  formatPercent,
  relativeTime,
} from "../../lib/format";
import {
  getFleetAttention,
  getStatusLabel,
  getVmHealth,
  isActionLocked,
} from "../../lib/vm-analytics";
import {
  getActionBusyLabel,
  getTransitionStatus,
  type LifecycleAction,
} from "../../lib/vm-actions";
import { UtilizationChart } from "../shared/UtilizationChart";
import { HealthBadge, StatusBadge } from "../shared/StatusBadge";
import {
  FleetDistributionChart,
  type DistributionQuadrant,
} from "./FleetDistributionChart";
import {
  UtilizationBucketChart,
  type UtilizationBucketMetric,
} from "./UtilizationBucketChart";
import { OPEN_ADMIN_VM_EVENT, type OpenAdminVmEvent } from "./adminEvents";

type FleetChartMode = "trend" | "buckets";
type InventoryTab = "all" | "attention" | "idle" | "hot" | "error";
type InventoryStatusFilter =
  | "all"
  | "running"
  | "stopped"
  | "transitioning"
  | "error";
type BreakdownStatusFilter = Exclude<InventoryStatusFilter, "all">;
type InventorySort =
  | "attention"
  | "name"
  | "owner"
  | "template"
  | "status"
  | "health"
  | "cost"
  | "cpu"
  | "memory"
  | "disk"
  | "lastActive";
type InventorySortDirection = "asc" | "desc";

const defaultInventoryTab: InventoryTab = "attention";
const defaultInventorySort: InventorySort = "attention";

const timeRangeLabels: Record<FleetPeriod, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const timeRangeOptions: Array<{
  value: FleetPeriod;
  label: string;
  ariaLabel: string;
}> = [
  { value: "24h", label: "24h", ariaLabel: "Last 24 hours" },
  { value: "7d", label: "7d", ariaLabel: "Last 7 days" },
  { value: "30d", label: "30d", ariaLabel: "Last 30 days" },
];

const chartModeOptions: Array<{
  value: FleetChartMode;
  label: string;
  ariaLabel: string;
}> = [
  { value: "trend", label: "Trend", ariaLabel: "Show utilization trend" },
  { value: "buckets", label: "Buckets", ariaLabel: "Show utilization buckets" },
];

const bucketMetricOptions: Array<{
  value: UtilizationBucketMetric;
  label: string;
  ariaLabel: string;
}> = [
  { value: "cpu", label: "CPU", ariaLabel: "Show CPU utilization buckets" },
  {
    value: "memory",
    label: "Memory",
    ariaLabel: "Show memory utilization buckets",
  },
];

const attentionHealth = new Set<VmHealth>(["idle", "hot", "error"]);
const defaultSortDirections: Record<InventorySort, InventorySortDirection> = {
  attention: "desc",
  name: "asc",
  owner: "asc",
  template: "asc",
  status: "asc",
  health: "desc",
  cost: "desc",
  cpu: "desc",
  memory: "desc",
  disk: "desc",
  lastActive: "asc",
};
export function AdminFleetPage() {
  const [timeRange, setTimeRange] = useState<FleetPeriod>("24h");
  const [chartMode, setChartMode] = useState<FleetChartMode>("trend");
  const [bucketMetric, setBucketMetric] =
    useState<UtilizationBucketMetric>("cpu");
  const [inventoryTab, setInventoryTab] =
    useState<InventoryTab>(defaultInventoryTab);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<InventoryStatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState<"all" | VmHealth>("all");
  const [sortBy, setSortBy] = useState<InventorySort>("attention");
  const [sortDirection, setSortDirection] = useState<InventorySortDirection>(
    defaultSortDirections[defaultInventorySort],
  );
  const [selectedVmId, setSelectedVmId] = useState<string | null>(null);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const refreshReleaseTimeoutRef = useRef<number | null>(null);
  const { autoRefresh, setAutoRefresh, refetchInterval } = useAdminRefresh();

  const fleetQuery = useQuery({
    queryKey: [...queryKeys.adminFleet, timeRange],
    queryFn: () => adminApi.getFleet(timeRange),
    placeholderData: keepPreviousData,
    refetchInterval,
  });

  const inventoryQuery = useQuery({
    queryKey: queryKeys.adminInventory,
    queryFn: adminApi.getInventory,
    refetchInterval,
  });

  const fleet = fleetQuery.data;
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

  const templateBreakdown = useMemo(() => {
    const rows = new Map<
      string,
      { id: string; name: string; count: number; hourlyCost: number }
    >();

    inventory.forEach((vm) => {
      const current = rows.get(vm.template.id) ?? {
        id: vm.template.id,
        name: vm.template.name,
        count: 0,
        hourlyCost: 0,
      };

      rows.set(vm.template.id, {
        ...current,
        count: current.count + 1,
        hourlyCost:
          current.hourlyCost + (vm.status === "stopped" ? 0 : vm.hourlyCost),
      });
    });

    return [...rows.values()].sort((a, b) => b.hourlyCost - a.hourlyCost);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const searchTokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const rows = inventory.filter((vm) => {
      const searchable = [
        vm.name,
        vm.owner.name,
        vm.owner.email,
        vm.owner.team,
        vm.template.name,
        vm.region,
        vm.status,
        vm.health,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.every((token) => searchable.includes(token));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "transitioning"
          ? vm.status === "starting" || vm.status === "stopping"
          : vm.status === statusFilter);
      const matchesOwner = ownerFilter === "all" || vm.owner.id === ownerFilter;
      const matchesTemplate =
        templateFilter === "all" || vm.template.id === templateFilter;
      const matchesHealth =
        healthFilter === "all" || vm.health === healthFilter;
      const matchesTab =
        inventoryTab === "all" ||
        (inventoryTab === "attention" && attentionHealth.has(vm.health)) ||
        vm.health === inventoryTab;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOwner &&
        matchesTemplate &&
        matchesHealth &&
        matchesTab
      );
    });

    return rows.sort((a, b) =>
      compareInventoryRows(a, b, sortBy, sortDirection),
    );
  }, [
    healthFilter,
    inventory,
    inventoryTab,
    ownerFilter,
    query,
    sortBy,
    sortDirection,
    statusFilter,
    templateFilter,
  ]);

  function updateInventorySort(nextSort: InventorySort) {
    setSortDirection((currentDirection) =>
      sortBy === nextSort
        ? toggleSortDirection(currentDirection)
        : defaultSortDirections[nextSort],
    );
    setSortBy(nextSort);
  }

  function setInventorySortPreset(nextSort: InventorySort) {
    setSortBy(nextSort);
    setSortDirection(defaultSortDirections[nextSort]);
  }

  function resetInventoryView() {
    setInventoryTab(defaultInventoryTab);
    setQuery("");
    setStatusFilter("all");
    setOwnerFilter("all");
    setTemplateFilter("all");
    setHealthFilter("all");
    setSortBy(defaultInventorySort);
    setSortDirection(defaultSortDirections[defaultInventorySort]);
  }

  useEffect(() => {
    function handleOpenVm(event: Event) {
      const { detail } = event as OpenAdminVmEvent;
      if (detail?.vmId) {
        setSelectedVmId(detail.vmId);
      }
    }

    window.addEventListener(OPEN_ADMIN_VM_EVENT, handleOpenVm);
    return () => window.removeEventListener(OPEN_ADMIN_VM_EVENT, handleOpenVm);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshReleaseTimeoutRef.current !== null) {
        window.clearTimeout(refreshReleaseTimeoutRef.current);
      }
    };
  }, []);

  if (fleetQuery.isLoading || inventoryQuery.isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="mb-6 h-20 rounded-lg" />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-[380px] rounded-lg" />
          <Skeleton className="h-[380px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (
    fleetQuery.isError ||
    inventoryQuery.isError ||
    !fleet ||
    !inventoryQuery.data
  ) {
    return (
      <ErrorState
        onRetry={() =>
          void Promise.all([fleetQuery.refetch(), inventoryQuery.refetch()])
        }
      />
    );
  }

  const attention = getFleetAttention(inventory);
  const idleVms = inventory.filter((vm) => vm.health === "idle");
  const hotVms = inventory.filter((vm) => vm.health === "hot");
  const errorVms = inventory.filter((vm) => vm.health === "error");
  const attentionVms = inventory.filter((vm) => attentionHealth.has(vm.health));
  const selectedVm = selectedVmId
    ? (inventory.find((vm) => vm.id === selectedVmId) ?? null)
    : null;

  const runningCount = inventory.filter((vm) => vm.status === "running").length;
  const stoppedCount = inventory.filter((vm) => vm.status === "stopped").length;
  const transitioningCount = inventory.filter(
    (vm) => vm.status === "starting" || vm.status === "stopping",
  ).length;
  const errorCount = inventory.filter((vm) => vm.status === "error").length;
  const healthyCount = inventory.filter((vm) => vm.health === "healthy").length;
  const runningLike = inventory.filter(
    (vm) =>
      vm.status === "running" ||
      vm.status === "starting" ||
      vm.status === "stopping",
  );
  const activeUsers = new Set(runningLike.map((vm) => vm.ownerId)).size;
  const templatesInUse = new Set(inventory.map((vm) => vm.templateId)).size;
  const vmsPerUser =
    fleet.totalUsers > 0 ? fleet.totalVms / fleet.totalUsers : 0;
  const lastUpdated = formatClock(fleetQuery.dataUpdatedAt || Date.now());
  const chartDateFormat = timeRange === "24h" ? "HH:mm" : "MMM d";
  const chartTooltipFormat = timeRange === "24h" ? "MMM d, HH:mm" : "MMM d";
  const isRefreshing =
    manualRefreshPending || fleetQuery.isFetching || inventoryQuery.isFetching;
  const isInventorySortCustomized =
    sortBy !== defaultInventorySort ||
    sortDirection !== defaultSortDirections[defaultInventorySort];
  const activeInventoryControlCount = [
    inventoryTab !== defaultInventoryTab,
    query.trim().length > 0,
    statusFilter !== "all",
    ownerFilter !== "all",
    templateFilter !== "all",
    healthFilter !== "all",
    isInventorySortCustomized,
  ].filter(Boolean).length;
  const isInventoryViewCustomized = activeInventoryControlCount > 0;
  function focusInventory(
    tab: InventoryTab,
    options: { scroll?: boolean } = {},
  ) {
    setInventoryTab(tab);
    setHealthFilter("all");

    if (options.scroll) {
      scrollToInventory();
    }
  }

  function scrollToInventory() {
    window.requestAnimationFrame(() => {
      inventoryRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      inventoryRef.current?.focus({ preventScroll: true });
    });
  }

  function resetInventoryContextForBreakdown() {
    setInventoryTab("all");
    setQuery("");
    setOwnerFilter("all");
    setHealthFilter("all");
  }

  function handleTemplateBreakdownSelect(templateId: string) {
    resetInventoryContextForBreakdown();
    setStatusFilter("all");
    setTemplateFilter(templateId);
    scrollToInventory();
  }

  function handleStatusBreakdownSelect(status: BreakdownStatusFilter) {
    resetInventoryContextForBreakdown();
    setTemplateFilter("all");
    setStatusFilter(status);
    scrollToInventory();
  }

  function handleQuadrantSelect(quadrant: DistributionQuadrant) {
    if (quadrant === "idle") {
      focusInventory("idle");
      setSortBy("lastActive");
      return;
    }

    if (quadrant === "hot") {
      focusInventory("hot");
      setSortBy("cpu");
      return;
    }

    focusInventory("all");
    setSortBy(quadrant === "memory-heavy" ? "memory" : "cpu");
  }

  function handleRefresh() {
    if (isRefreshing) return;

    if (refreshReleaseTimeoutRef.current !== null) {
      window.clearTimeout(refreshReleaseTimeoutRef.current);
      refreshReleaseTimeoutRef.current = null;
    }

    setManualRefreshPending(true);
    const startedAt = Date.now();

    void Promise.all([fleetQuery.refetch(), inventoryQuery.refetch()]).finally(
      () => {
        const remainingMs = Math.max(0, 300 - (Date.now() - startedAt));
        refreshReleaseTimeoutRef.current = window.setTimeout(() => {
          setManualRefreshPending(false);
          refreshReleaseTimeoutRef.current = null;
        }, remainingMs);
      },
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            Fleet command center
          </h2>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
            {fleet.totalVms} VMs across {fleet.totalUsers} engineers · Last
            updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeControl value={timeRange} onChange={setTimeRange} />
          <AutoRefreshToggle enabled={autoRefresh} onChange={setAutoRefresh} />
          <RefreshButton isRefreshing={isRefreshing} onClick={handleRefresh} />
          <Link
            to="/admin/templates"
            search={{ create: "template" }}
            className={buttonClassName({ variant: "primary", size: "md" })}
          >
            <Plus className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Create template
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <CockpitMetric
          label="Fleet health"
          value={`${fleet.totalVms} total VMs`}
          helper="Live status and health signals"
        >
          <SegmentedStatusBar
            total={fleet.totalVms}
            segments={[
              {
                label: "Running",
                count: runningCount,
                className: "bg-emerald-500",
              },
              {
                label: "Stopped",
                count: stoppedCount,
                className: "bg-gray-400",
              },
              {
                label: "Transitioning",
                count: transitioningCount,
                className: "bg-violet-500",
              },
              { label: "Error", count: errorCount, className: "bg-red-500" },
            ]}
          />
          <HealthSummary
            healthyCount={healthyCount}
            attentionCount={attentionVms.length}
            onNeedsAttention={() =>
              focusInventory("attention", { scroll: true })
            }
          />
        </CockpitMetric>

        <CockpitMetric
          label="Utilization"
          value={`${formatPercent(fleet.avgCpuUtilizationPercent)} CPU avg`}
          helper={`Running VMs only - ${timeRangeLabels[timeRange]}`}
        >
          <MetricLine
            label="CPU"
            value={`${formatPercent(fleet.avgCpuUtilizationPercent)} / ${formatPercent(fleet.peakCpuUtilizationPercent)} peak`}
          />
          <MetricLine
            label="Memory"
            value={`${formatPercent(fleet.avgMemoryUtilizationPercent)} / ${formatPercent(fleet.peakMemoryUtilizationPercent)} peak`}
          />
        </CockpitMetric>

        <CockpitMetric
          label="Infrastructure cost"
          value={`${formatCurrency(fleet.totalHourlyCost)}/hr`}
          helper={`${formatCurrency(fleet.projectedMonthlyCost)} projected month`}
        >
          <MetricLine
            label="Month to date"
            value={formatCurrency(fleet.monthToDateCost)}
          />
          <MetricActionLine
            label="Idle savings"
            value={`${formatCurrency(attention.possibleDailySavings)}/day`}
            onClick={() => focusInventory("idle")}
          />
        </CockpitMetric>

        <CockpitMetric
          label="Capacity"
          value={`${fleet.totalUsers} users`}
          helper={`${activeUsers} active users · ${templatesInUse} templates`}
        >
          <MetricLine label="VMs per user" value={vmsPerUser.toFixed(1)} />
          <MetricLine
            label="Active machines"
            value={`${runningCount} running`}
          />
        </CockpitMetric>
      </div>

      <div
        ref={inventoryRef}
        className="mt-4 scroll-mt-20 focus:outline-none"
        tabIndex={-1}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <CardTitle>VM inventory</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isInventoryViewCustomized ? (
                  <InventoryViewResetButton
                    count={activeInventoryControlCount}
                    onReset={resetInventoryView}
                  />
                ) : null}
                <InventoryTabs
                  activeTab={inventoryTab}
                  counts={{
                    all: inventory.length,
                    attention: attentionVms.length,
                    idle: idleVms.length,
                    hot: hotVms.length,
                    error: errorVms.length,
                  }}
                  onChange={focusInventory}
                />
                <Link
                  to="/admin/vms"
                  aria-label="Open full VM inventory"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "md",
                    className: "w-8 px-0 2xl:w-auto 2xl:px-3",
                  })}
                >
                  <span className="sr-only 2xl:not-sr-only">
                    Full inventory
                  </span>
                  <ArrowRight
                    className="size-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_170px_190px_160px_170px]">
              <Input
                aria-label="Search VMs"
                leadingIcon={
                  <SearchMd
                    className="size-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                }
                placeholder="Search VMs, owners, templates..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as InventoryStatusFilter)
                }
                aria-label="Status filter"
              >
                <option value="all">All statuses</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
                <option value="transitioning">Transitioning</option>
                <option value="error">Error</option>
              </Select>
              <Select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                aria-label="Owner filter"
              >
                <option value="all">All owners</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                value={templateFilter}
                onChange={(event) => setTemplateFilter(event.target.value)}
                aria-label="Template filter"
              >
                <option value="all">All templates</option>
                {templates.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                value={healthFilter}
                onChange={(event) =>
                  setHealthFilter(event.target.value as "all" | VmHealth)
                }
                aria-label="Signal filter"
              >
                <option value="all">Signal: all</option>
                <option value="healthy">Healthy</option>
                <option value="idle">Idle</option>
                <option value="hot">Hot</option>
                <option value="error">Error</option>
                <option value="transitioning">Transitioning</option>
                <option value="stopped">Stopped</option>
              </Select>
              <Select
                value={sortBy}
                onChange={(event) =>
                  setInventorySortPreset(event.target.value as InventorySort)
                }
                aria-label="Sort inventory"
              >
                <option value="attention">Sort: attention</option>
                <option value="name">Sort: VM</option>
                <option value="owner">Sort: owner</option>
                <option value="template">Sort: template</option>
                <option value="status">Sort: status</option>
                <option value="health">Sort: signal</option>
                <option value="cost">Sort: cost</option>
                <option value="cpu">Sort: CPU</option>
                <option value="memory">Sort: memory</option>
                <option value="disk">Sort: disk</option>
                <option value="lastActive">Sort: last active</option>
              </Select>
            </div>
          </CardHeader>

          {filteredInventory.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No VMs match these filters"
                description="Try clearing the search, status, owner, template or health filters."
              />
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto scrollbar-thin">
              <table className="min-w-[1320px] w-full divide-y divide-gray-200 text-[13px] dark:divide-white/10">
                <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-[#191919] dark:text-gray-400">
                  <tr>
                    <SortableHeader
                      label="VM"
                      sortKey="name"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Owner"
                      sortKey="owner"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Template"
                      sortKey="template"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Signal"
                      sortKey="health"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="CPU"
                      sortKey="cpu"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Memory"
                      sortKey="memory"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      label="Disk"
                      sortKey="disk"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      className="w-[132px] min-w-[132px]"
                      label="Activity"
                      sortKey="lastActive"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <SortableHeader
                      align="right"
                      label="Cost"
                      sortKey="cost"
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      onSort={updateInventorySort}
                    />
                    <th className="w-14 min-w-14 px-3 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-transparent">
                  {filteredInventory.map((vm) => (
                    <tr
                      key={vm.id}
                      className={cn(
                        "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5",
                        vm.health === "idle" &&
                          "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-500/5 dark:hover:bg-amber-500/10",
                        vm.health === "hot" &&
                          "bg-orange-50/40 hover:bg-orange-50/70 dark:bg-orange-500/5 dark:hover:bg-orange-500/10",
                        vm.health === "error" &&
                          "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-500/5 dark:hover:bg-red-500/10",
                      )}
                      onClick={() => setSelectedVmId(vm.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {vm.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {vm.region}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {vm.owner.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {vm.owner.team}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {vm.template.name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={vm.status} />
                      </td>
                      <td className="px-4 py-3">
                        <HealthBadge health={vm.health} />
                      </td>
                      <td className="px-4 py-3">
                        <UtilizationCell value={vm.cpuUsagePercent} />
                      </td>
                      <td className="px-4 py-3">
                        <UtilizationCell value={vm.memoryUsagePercent} />
                      </td>
                      <td className="px-4 py-3">
                        <UtilizationCell value={vm.diskUsagePercent} />
                      </td>
                      <td className="w-[132px] min-w-[132px] whitespace-nowrap px-4 py-3">
                        <div>
                          <p className="text-gray-700 dark:text-gray-300">
                            {relativeTime(vm.lastActiveAt)}
                          </p>
                          <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                            {getUptimeLabel(vm)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                        {formatCurrency(vm.hourlyCost)}/hr
                      </td>
                      <td className="w-14 min-w-14 px-3 py-3">
                        <TableActions
                          vm={vm}
                          onOpen={() => setSelectedVmId(vm.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch">
        <div className="grid gap-4 xl:grid-rows-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Fleet utilization</CardTitle>
                  <CardDescription>
                    {chartMode === "trend"
                      ? "Aggregate CPU and memory, with active VM count on the right axis."
                      : "Active VM counts grouped by selected utilization range."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {chartMode === "trend" ? (
                    <FleetTrendLegend />
                  ) : (
                    <BucketMetricControl
                      value={bucketMetric}
                      onChange={setBucketMetric}
                    />
                  )}
                  <ChartModeControl value={chartMode} onChange={setChartMode} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedChartPanel mode={chartMode}>
                {chartMode === "trend" ? (
                  <UtilizationChart
                    data={fleet.utilizationTrend}
                    height={340}
                    tickFormat={chartDateFormat}
                    tooltipFormat={chartTooltipFormat}
                  />
                ) : (
                  <UtilizationBucketChart
                    metrics={fleet.vmMetrics}
                    metric={bucketMetric}
                    height={340}
                  />
                )}
              </AnimatedChartPanel>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>CPU vs memory map</CardTitle>
                  <CardDescription>
                    Each point is a VM; bubble size follows hourly cost.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />{" "}
                    Healthy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" /> Idle
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-orange-500" /> Hot
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-500" /> Error
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FleetDistributionChart
                vms={inventory}
                onPointSelect={setSelectedVmId}
                onQuadrantSelect={handleQuadrantSelect}
              />
            </CardContent>
          </Card>
        </div>

        <BreakdownPanel
          className="xl:h-full"
          templateBreakdown={templateBreakdown}
          statusCounts={{
            running: runningCount,
            stopped: stoppedCount,
            transitioning: transitioningCount,
            error: errorCount,
          }}
          totalVms={fleet.totalVms}
          activeTemplateId={templateFilter === "all" ? null : templateFilter}
          activeStatus={statusFilter === "all" ? null : statusFilter}
          onTemplateSelect={handleTemplateBreakdownSelect}
          onStatusSelect={handleStatusBreakdownSelect}
        />
      </div>

      <VmDetailDrawer vm={selectedVm} onClose={() => setSelectedVmId(null)} />
    </div>
  );
}

function TimeRangeControl({
  value,
  onChange,
}: {
  value: FleetPeriod;
  onChange: (value: FleetPeriod) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(
    0,
    timeRangeOptions.findIndex((option) => option.value === value),
  );
  const activePillTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "tween", duration: 0.16, ease: "easeOut" };

  return (
    <div
      className="relative inline-grid grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-[#111]"
      role="group"
      aria-label="Time range"
    >
      <motion.span
        className="pointer-events-none absolute left-0.5 top-0.5 h-8 w-12 rounded-md bg-gray-950 dark:bg-gray-100"
        animate={{ x: activeIndex * 48 }}
        transition={activePillTransition}
        aria-hidden="true"
      />
      {timeRangeOptions.map(({ value: range, label, ariaLabel }) => {
        const isActive = value === range;

        return (
          <button
            key={range}
            type="button"
            className="group relative z-10 h-8 w-12 rounded-md px-2 text-[13px] font-medium leading-[18px] transition-colors duration-100 hover:text-gray-900 dark:hover:text-gray-100"
            onClick={() => onChange(range)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
          >
            <span
              className={cn(
                "relative z-10 block whitespace-nowrap transition-colors duration-100",
                isActive
                  ? "text-white dark:text-gray-950"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InventoryViewResetButton({
  count,
  onReset,
}: {
  count: number;
  onReset: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-white/80 px-2.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-blue-400/20 dark:bg-white/10 dark:text-blue-200 dark:hover:border-blue-300/40 dark:hover:text-blue-100"
      onClick={onReset}
      aria-label={`Reset inventory view to default filters and sorting (${count} active)`}
    >
      <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
      Reset view ({count})
    </button>
  );
}

function ChartModeControl({
  value,
  onChange,
}: {
  value: FleetChartMode;
  onChange: (value: FleetChartMode) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(
    0,
    chartModeOptions.findIndex((option) => option.value === value),
  );
  const activePillTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "tween", duration: 0.16, ease: "easeOut" };

  return (
    <div
      className="relative inline-grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-[#111]"
      role="group"
      aria-label="Fleet chart mode"
    >
      <motion.span
        className="pointer-events-none absolute left-0.5 top-0.5 h-8 w-20 rounded-md bg-gray-950 dark:bg-gray-100"
        animate={{ x: activeIndex * 80 }}
        transition={activePillTransition}
        aria-hidden="true"
      />
      {chartModeOptions.map(({ value: mode, label, ariaLabel }) => {
        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            className="relative z-10 h-8 w-20 rounded-md px-2 text-[13px] font-medium leading-[18px] transition-colors duration-100 hover:text-gray-900 dark:hover:text-gray-100"
            onClick={() => onChange(mode)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
          >
            <span
              className={cn(
                "relative z-10 block whitespace-nowrap transition-colors duration-100",
                isActive
                  ? "text-white dark:text-gray-950"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BucketMetricControl({
  value,
  onChange,
}: {
  value: UtilizationBucketMetric;
  onChange: (value: UtilizationBucketMetric) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(
    0,
    bucketMetricOptions.findIndex((option) => option.value === value),
  );
  const activePillTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "tween", duration: 0.16, ease: "easeOut" };

  return (
    <div
      className="relative inline-grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-[#111]"
      role="group"
      aria-label="Bucket metric"
    >
      <motion.span
        className="pointer-events-none absolute left-0.5 top-0.5 h-8 w-20 rounded-md bg-white shadow-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10"
        animate={{ x: activeIndex * 80 }}
        transition={activePillTransition}
        aria-hidden="true"
      />
      {bucketMetricOptions.map(({ value: metric, label, ariaLabel }) => {
        const isActive = value === metric;

        return (
          <button
            key={metric}
            type="button"
            className="relative z-10 h-8 w-20 rounded-md px-2 text-[13px] font-medium leading-[18px] transition-colors duration-100 hover:text-gray-900 dark:hover:text-gray-100"
            onClick={() => onChange(metric)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
          >
            <span
              className={cn(
                "relative z-10 block whitespace-nowrap transition-colors duration-100",
                isActive
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FleetTrendLegend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-brand-600" /> CPU
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-violet-600" /> Memory
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-px w-4 border-t border-dashed border-gray-500" />{" "}
        Active VMs
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-px w-4 border-t border-dashed border-red-400" />{" "}
        85% threshold
      </span>
    </div>
  );
}

function AnimatedChartPanel({
  mode,
  children,
}: {
  mode: FleetChartMode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-[340px] overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function RefreshButton({
  isRefreshing,
  onClick,
}: {
  isRefreshing: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="md"
      variant="secondary"
      disabled={isRefreshing}
      className="min-w-[6.25rem]"
      aria-busy={isRefreshing}
      aria-label="Refresh fleet data"
      onClick={onClick}
    >
      <span className="relative size-4 shrink-0" aria-hidden="true">
        <RefreshCw01
          className={cn(
            "absolute inset-0 size-4 transition-opacity duration-150",
            isRefreshing ? "opacity-0" : "opacity-100",
          )}
          strokeWidth={1.8}
        />
        <span
          className={cn(
            "absolute inset-0 size-4 rounded-full border-2 border-current border-t-transparent transition-opacity duration-150",
            isRefreshing ? "animate-spin opacity-100" : "opacity-0",
          )}
        />
      </span>
      <span>Refresh</span>
    </Button>
  );
}

function AutoRefreshToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-[#111] dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-100",
      )}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          enabled ? "bg-emerald-500" : "bg-gray-400",
        )}
        aria-hidden="true"
      />
      Auto refresh {enabled ? "on" : "off"}
    </button>
  );
}

function CockpitMetric({
  label,
  value,
  helper,
  children,
}: {
  label: string;
  value: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[184px] flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
      <div className="min-h-[76px]">
        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
          {value}
        </p>
        <p className="mt-1 min-h-5 text-[13px] text-gray-500 dark:text-gray-400">
          {helper}
        </p>
      </div>
      <div className="mt-3 border-t border-gray-200 pt-3 dark:border-white/10">
        <div className="space-y-1.5">{children}</div>
      </div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-5 items-center justify-between gap-3 text-[13px] leading-5">
      <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

function MetricActionLine({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex min-h-5 w-full items-center justify-between gap-3 rounded-sm text-[13px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:focus-visible:ring-white/10"
      onClick={onClick}
      type="button"
      aria-label={`Review ${label.toLowerCase()} with ${value} possible savings`}
    >
      <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-amber-700 group-hover:text-amber-800 dark:text-amber-400 dark:group-hover:text-amber-300">
        {value}
      </span>
    </button>
  );
}

function SegmentedStatusBar({
  total,
  segments,
}: {
  total: number;
  segments: { label: string; count: number; className: string }[];
}) {
  const shortLabels: Record<string, string> = {
    Running: "Run",
    Stopped: "Stop",
    Transitioning: "Trans",
    Error: "Err",
  };

  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
        aria-hidden="true"
      >
        {segments.map((segment) =>
          segment.count > 0 ? (
            <div
              key={segment.label}
              className={segment.className}
              style={{
                width: `${Math.max((segment.count / Math.max(total, 1)) * 100, 4)}%`,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex flex-nowrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
            aria-label={`${segment.label} ${segment.count}`}
          >
            <span
              className={cn("size-1.5 rounded-full", segment.className)}
              aria-hidden="true"
            />
            {shortLabels[segment.label] ?? segment.label} {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function HealthSummary({
  healthyCount,
  attentionCount,
  onNeedsAttention,
}: {
  healthyCount: number;
  attentionCount: number;
  onNeedsAttention: () => void;
}) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3 text-[13px] leading-5">
      <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">
        Health
      </span>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium tabular-nums text-gray-900 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:text-gray-100 dark:hover:text-white dark:focus-visible:ring-white/10"
        onClick={onNeedsAttention}
        type="button"
      >
        <span className="inline-flex items-center gap-1">
          <span
            className="size-1.5 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          {healthyCount} ok
        </span>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
          ·
        </span>
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <span
            className="size-1.5 rounded-full bg-amber-500"
            aria-hidden="true"
          />
          {attentionCount} attention
        </span>
      </button>
    </div>
  );
}

function BreakdownPanel({
  className,
  templateBreakdown,
  statusCounts,
  totalVms,
  activeTemplateId,
  activeStatus,
  onTemplateSelect,
  onStatusSelect,
}: {
  className?: string;
  templateBreakdown: {
    id: string;
    name: string;
    count: number;
    hourlyCost: number;
  }[];
  statusCounts: {
    running: number;
    stopped: number;
    transitioning: number;
    error: number;
  };
  totalVms: number;
  activeTemplateId: string | null;
  activeStatus: InventoryStatusFilter | null;
  onTemplateSelect: (templateId: string) => void;
  onStatusSelect: (status: BreakdownStatusFilter) => void;
}) {
  const maxTemplateCost = Math.max(
    ...templateBreakdown.map((item) => item.hourlyCost),
    1,
  );
  const statusBreakdown: {
    id: BreakdownStatusFilter;
    label: string;
    count: number;
    className: string;
  }[] = [
    {
      id: "running",
      label: "Running",
      count: statusCounts.running,
      className: "bg-emerald-500",
    },
    {
      id: "stopped",
      label: "Stopped",
      count: statusCounts.stopped,
      className: "bg-gray-400",
    },
    {
      id: "transitioning",
      label: "Transitioning",
      count: statusCounts.transitioning,
      className: "bg-violet-500",
    },
    {
      id: "error",
      label: "Error",
      count: statusCounts.error,
      className: "bg-red-500",
    },
  ];
  const maxStatusCount = Math.max(
    ...statusBreakdown.map((item) => item.count),
    1,
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Breakdown</CardTitle>
        <CardDescription>
          Template cost concentration and current status mix.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              By template
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Active cost
            </span>
          </div>
          <div className="space-y-1">
            {templateBreakdown.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:focus-visible:ring-white/10",
                  activeTemplateId === item.id
                    ? "bg-gray-100 dark:bg-white/10"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.06]",
                )}
                onClick={() => onTemplateSelect(item.id)}
                aria-pressed={activeTemplateId === item.id}
                aria-label={`Filter inventory by template ${item.name}`}
              >
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-900 dark:text-gray-100">
                    {item.count} VMs · {formatCurrency(item.hourlyCost)}/hr
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.max((item.hourlyCost / maxTemplateCost) * 100, item.hourlyCost > 0 ? 8 : 0)}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              By status
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalVms} total
            </span>
          </div>
          <div className="space-y-1">
            {statusBreakdown.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:focus-visible:ring-white/10",
                  activeStatus === item.id
                    ? "bg-gray-100 dark:bg-white/10"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.06]",
                )}
                onClick={() => onStatusSelect(item.id)}
                aria-pressed={activeStatus === item.id}
                aria-label={`Filter inventory by status ${item.label}`}
              >
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                    <span
                      className={cn("size-1.5 rounded-full", item.className)}
                      aria-hidden="true"
                    />
                    {item.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-900 dark:text-gray-100">
                    {item.count} VMs
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className={cn("h-full rounded-full", item.className)}
                    style={{
                      width: `${Math.max((item.count / maxStatusCount) * 100, item.count > 0 ? 8 : 0)}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableHeader({
  label,
  sortKey,
  sortBy,
  sortDirection,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: InventorySort;
  sortBy: InventorySort;
  sortDirection: InventorySortDirection;
  onSort: (sort: InventorySort) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = sortBy === sortKey;

  return (
    <th
      aria-sort={
        isActive
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={cn("px-4 py-3", align === "right" && "text-right", className)}
    >
      <button
        className={cn(
          "inline-flex items-center gap-1 font-semibold uppercase transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950/10 dark:hover:text-gray-200 dark:focus-visible:ring-white/10",
          align === "right" && "justify-end",
        )}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        {label}
        <span
          className="w-3 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        >
          {isActive ? (sortDirection === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}

function InventoryTabs({
  activeTab,
  counts,
  onChange,
}: {
  activeTab: InventoryTab;
  counts: Record<InventoryTab, number>;
  onChange: (tab: InventoryTab) => void;
}) {
  const tabs: { id: InventoryTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "attention", label: "Needs attention" },
    { id: "idle", label: "Idle" },
    { id: "hot", label: "Hot" },
    { id: "error", label: "Error" },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Inventory view"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
            activeTab === tab.id
              ? "border-gray-950 bg-gray-950 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-[#111] dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-100",
          )}
          onClick={() => onChange(tab.id)}
          aria-pressed={activeTab === tab.id}
        >
          {tab.label}
          <span className="tabular-nums opacity-70">{counts[tab.id]}</span>
        </button>
      ))}
    </div>
  );
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

function TableActions({
  vm,
  onOpen,
}: {
  vm: VMWithRelations;
  onOpen: () => void;
}) {
  return (
    <div
      className="flex justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu
        label={`Actions for ${vm.name}`}
        trigger={
          <DotsHorizontal
            className="size-4"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        }
      >
        <DropdownMenuItem onSelect={onOpen}>
          <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />
          View details
        </DropdownMenuItem>
        {vm.status === "running" ? (
          <RowMachineActionMenuItem
            vm={vm}
            action="stop"
            label="Stop machine"
            tone="danger"
          />
        ) : null}
        {vm.status === "stopped" ? (
          <RowMachineActionMenuItem
            vm={vm}
            action="start"
            label="Start machine"
          />
        ) : null}
        {vm.status === "error" ? (
          <RowMachineActionMenuItem
            vm={vm}
            action="restart"
            label="Retry start"
          />
        ) : null}
      </DropdownMenu>
    </div>
  );
}

function RowMachineActionMenuItem({
  vm,
  action,
  label,
  tone = "default",
}: {
  vm: VMWithRelations;
  action: LifecycleAction;
  label: string;
  tone?: "default" | "danger";
}) {
  const mutation = useAdminMachineAction(vm);
  const locked = isActionLocked(vm.status) || mutation.isPending;
  const Icon =
    action === "stop" ? Stop : action === "start" ? Play : RefreshCcw01;

  return (
    <DropdownMenuItem
      disabled={locked}
      onSelect={() => mutation.mutate(action)}
      tone={tone}
    >
      <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
      {locked
        ? getActionBusyLabel(
            mutation.isPending ? mutation.variables : (vm.lifecycleAction ?? undefined),
            vm.status,
          )
        : label}
    </DropdownMenuItem>
  );
}

function VmDetailDrawer({
  vm,
  onClose,
}: {
  vm: VMWithRelations | null;
  onClose: () => void;
}) {
  const trend = useMemo(() => (vm ? makeLocalTrend(vm) : []), [vm]);

  return (
    <Drawer
      open={Boolean(vm)}
      title={vm?.name ?? "VM detail"}
      description={
        vm ? `${vm.owner.name} · ${vm.template.name} · ${vm.region}` : undefined
      }
      onClose={onClose}
    >
      {vm ? (
        <div className="space-y-5">
          <dl className="grid gap-2 sm:grid-cols-3">
            <BadgeField label="Status">
              <StatusBadge status={vm.status} />
            </BadgeField>
            <BadgeField label="Signal">
              <HealthBadge health={vm.health} />
            </BadgeField>
            <BadgeField label="Cost">
              <Badge tone="gray">{formatCurrency(vm.hourlyCost)}/hr</Badge>
            </BadgeField>
          </dl>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataItem
              label="Owner"
              value={vm.owner.name}
              helper={vm.owner.team}
            />
            <MetadataItem
              label="Template"
              value={vm.template.name}
              helper={`${vm.template.vCpu} vCPU · ${vm.template.memoryGb} GB RAM · ${vm.template.diskSizeGb} GB disk`}
            />
            <MetadataItem label="Region" value={vm.region} />
            <MetadataItem {...getRuntimeMetadata(vm)} />
          </div>

          <section className="rounded-lg border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                CPU and memory
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Recent CPU and memory telemetry for this VM.
              </p>
            </div>
            <div className="p-4">
              <UtilizationChart data={trend} height={220} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              Current resources
            </h3>
            <div className="mt-4 space-y-4">
              <ProgressBar value={vm.cpuUsagePercent} label="CPU" />
              <ProgressBar value={vm.memoryUsagePercent} label="Memory" />
              <ProgressBar value={vm.diskUsagePercent} label="Disk" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              Operational details
            </h3>
            <dl className="mt-3 space-y-3 text-[13px]">
              <MetadataLine
                label="Created"
                value={relativeTime(vm.createdAt)}
              />
              <MetadataLine
                label="Last active"
                value={relativeTime(vm.lastActiveAt)}
              />
              <MetadataLine
                label="Lifecycle status"
                value={getStatusLabel(vm.status)}
              />
              <MetadataLine
                label="Health signal"
                value={getHealthLabel(vm.health)}
              />
              <MetadataLine
                label="Projected daily cost"
                value={formatCurrency(vm.hourlyCost * 24)}
              />
            </dl>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-5 dark:border-white/10">
            {vm.status === "running" ? (
              <ButtonLink
                href={`https://ide.ascendra.dev/workspaces/${vm.id}`}
                target="_blank"
                rel="noreferrer"
                variant="primary"
                aria-label={`Open ${vm.name} in browser IDE`}
              >
                <Terminal
                  className="size-4"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Open in IDE
                <LinkExternal01
                  className="size-3.5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </ButtonLink>
            ) : null}
            {vm.status === "stopped" ? (
              <MachineActionButton
                vm={vm}
                action="start"
                label="Start"
                variant="primary"
                size="md"
              />
            ) : null}
            {vm.status === "running" ? (
              <>
                <MachineActionButton
                  vm={vm}
                  action="restart"
                  label="Restart"
                  size="md"
                />
                <MachineActionButton
                  vm={vm}
                  action="stop"
                  label="Stop"
                  variant="danger"
                  size="md"
                />
              </>
            ) : null}
            {vm.status === "error" ? (
              <MachineActionButton
                vm={vm}
                action="restart"
                label="Retry"
                variant="primary"
                size="md"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function BadgeField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1.5 flex min-h-6 items-center">{children}</dd>
    </div>
  );
}

function MetadataItem({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function MetadataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}

function MachineActionButton({
  vm,
  action,
  label,
  variant = "secondary",
  size = "sm",
}: {
  vm: VMWithRelations;
  action: LifecycleAction;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}) {
  const mutation = useAdminMachineAction(vm);
  const locked = isActionLocked(vm.status) || mutation.isPending;
  const Icon =
    action === "stop" ? Stop : action === "start" ? Play : RefreshCcw01;

  return (
    <Button
      size={size}
      variant={variant}
      loading={locked}
      disabled={locked}
      aria-label={`${label} ${vm.name}`}
      onClick={(event) => {
        event.stopPropagation();
        mutation.mutate(action);
      }}
    >
      {!locked ? (
        <Icon className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
      ) : null}
      {locked
        ? getActionBusyLabel(
            mutation.isPending ? mutation.variables : (vm.lifecycleAction ?? undefined),
            vm.status,
          )
        : label}
    </Button>
  );
}

function useAdminMachineAction(vm: VMWithRelations) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: LifecycleAction) => {
      if (action === "start") return workspaceApi.startMachine(vm.id);
      if (action === "stop") return workspaceApi.stopMachine(vm.id);
      return workspaceApi.restartMachine(vm.id);
    },
    onMutate: async (action) => {
      const status = getTransitionStatus(action);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.adminInventory }),
        queryClient.cancelQueries({ queryKey: queryKeys.adminFleet }),
      ]);

      const previousInventory = queryClient.getQueryData<VMWithRelations[]>(
        queryKeys.adminInventory,
      );

      queryClient.setQueryData<VMWithRelations[]>(
        queryKeys.adminInventory,
        (current) =>
          current?.map((item) =>
            item.id === vm.id ? patchVm(item, { lifecycleAction: action, status }) : item,
          ),
      );

      return { previousInventory };
    },
    onError: (_error, _action, context) => {
      queryClient.setQueryData(
        queryKeys.adminInventory,
        context?.previousInventory,
      );
    },
    onSuccess: (updatedMachine, action) => {
      const lifecycleAction = isActionLocked(updatedMachine.status)
        ? action
        : null;

      queryClient.setQueryData<VMWithRelations[]>(
        queryKeys.adminInventory,
        (current) =>
          current?.map((item) =>
            item.id === vm.id
              ? patchVm(item, {
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
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminInventory,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminFleet });
      }, 1650);
    },
  });
}

function patchVm(
  vm: VMWithRelations,
  patch: Partial<VMWithRelations>,
): VMWithRelations {
  const updated = { ...vm, ...patch };
  return {
    ...updated,
    health: getVmHealth(updated),
  };
}

function compareInventoryRows(
  a: VMWithRelations,
  b: VMWithRelations,
  sortBy: InventorySort,
  sortDirection: InventorySortDirection,
) {
  const direction = sortDirection === "asc" ? 1 : -1;
  const fallback = a.name.localeCompare(b.name);
  let result = 0;

  if (sortBy === "name") result = a.name.localeCompare(b.name);
  if (sortBy === "owner") result = a.owner.name.localeCompare(b.owner.name);
  if (sortBy === "template")
    result = a.template.name.localeCompare(b.template.name);
  if (sortBy === "status")
    result = statusScore(a.status) - statusScore(b.status);
  if (sortBy === "health") result = attentionScore(a) - attentionScore(b);
  if (sortBy === "cost") result = a.hourlyCost - b.hourlyCost;
  if (sortBy === "cpu") result = a.cpuUsagePercent - b.cpuUsagePercent;
  if (sortBy === "memory") result = a.memoryUsagePercent - b.memoryUsagePercent;
  if (sortBy === "disk") result = a.diskUsagePercent - b.diskUsagePercent;
  if (sortBy === "lastActive")
    result =
      new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime();
  if (sortBy === "attention")
    result =
      attentionScore(a) - attentionScore(b) ||
      a.hourlyCost - b.hourlyCost ||
      a.cpuUsagePercent - b.cpuUsagePercent;

  return result === 0 ? fallback : result * direction;
}

function attentionScore(vm: VMWithRelations) {
  const scores: Record<VmHealth, number> = {
    error: 5,
    hot: 4,
    idle: 3,
    transitioning: 2,
    healthy: 1,
    stopped: 0,
  };

  return scores[vm.health];
}

function statusScore(status: VMStatus) {
  const scores: Record<VMStatus, number> = {
    stopped: 0,
    starting: 1,
    stopping: 2,
    running: 3,
    error: 4,
  };

  return scores[status];
}

function toggleSortDirection(
  direction: InventorySortDirection,
): InventorySortDirection {
  return direction === "asc" ? "desc" : "asc";
}

function getUptimeLabel(vm: VMWithRelations) {
  const runtime = getRuntimeMetadata(vm);
  if (vm.status === "error") {
    return runtime.value === "Unavailable"
      ? "Failed"
      : `Failed after ${runtime.value}`;
  }
  const value = runtime.value;
  if (value === "Not running") return value;
  return `Uptime ${value}`;
}

function getRuntimeMetadata(vm: VMWithRelations) {
  const helper = `Last active ${relativeTime(vm.lastActiveAt)}`;

  if (vm.status === "stopped") {
    return { label: "Runtime", value: "Not running", helper };
  }

  if (vm.status === "error") {
    if (!vm.startedAt) {
      return { label: "Runtime before error", value: "Unavailable", helper };
    }

    const startedAt = new Date(vm.startedAt).getTime();
    const lastActiveAt = new Date(vm.lastActiveAt).getTime();
    const minutes = Math.max(
      0,
      Math.floor((lastActiveAt - startedAt) / 60_000),
    );

    return {
      label: "Runtime before error",
      value: minutes > 0 ? formatDuration(minutes) : "Under 1m",
      helper,
    };
  }

  return { label: "Uptime", value: getUptimeValue(vm), helper };
}

function getUptimeValue(vm: VMWithRelations) {
  if (!vm.startedAt || vm.status === "stopped") return "Not running";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(vm.startedAt).getTime()) / 60_000),
  );
  return formatDuration(minutes);
}

function getHealthLabel(health: VmHealth) {
  const labels: Record<VmHealth, string> = {
    healthy: "Healthy",
    idle: "Idle",
    hot: "Hot",
    error: "Error",
    transitioning: "Transitioning",
    stopped: "Stopped",
  };

  return labels[health];
}

function formatClock(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function makeLocalTrend(vm: VMWithRelations) {
  const now = Date.now();
  const phase = Number(vm.id.replace("vm_", "")) / 100;

  return Array.from({ length: 24 }, (_, index) => {
    const timestamp = new Date(
      now - (23 - index) * 60 * 60 * 1000,
    ).toISOString();

    if (vm.status === "stopped" || vm.status === "error") {
      return {
        timestamp,
        cpuPercent: 0,
        memoryPercent: 0,
      };
    }

    return {
      timestamp,
      cpuPercent: boundedWave(
        index,
        phase,
        Math.max(vm.cpuUsagePercent, 8),
        12,
      ),
      memoryPercent: boundedWave(
        index,
        phase + 1.1,
        Math.max(vm.memoryUsagePercent, 12),
        10,
      ),
    };
  });
}

function boundedWave(
  index: number,
  phase: number,
  base: number,
  spread: number,
) {
  const value =
    base +
    Math.sin(index / 2.7 + phase) * spread +
    Math.cos(index / 4.4 + phase) * (spread / 2);
  return Math.max(0, Math.min(98, Math.round(value)));
}
