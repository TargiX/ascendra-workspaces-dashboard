import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy01, Edit03, Trash01 } from "@untitledui/icons";
import { adminApi, queryKeys } from "../../api/client";
import type { TemplateInput, VMTemplate } from "../../domain/types";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Drawer } from "../../components/ui/Drawer";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";

const emptyTemplate: TemplateInput = {
  name: "",
  description: "",
  baseImage: "ubuntu-24.04",
  vCpu: 4,
  memoryGb: 8,
  diskSizeGb: 80,
  preinstalledTools: ["vscode-server"],
};

const baseImageOptions = [
  { value: "ubuntu-24.04", label: "Ubuntu 24.04 LTS" },
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "ubuntu-22.04-cuda", label: "Ubuntu 22.04 CUDA" },
];

function toTemplateInput(template: VMTemplate, name = template.name): TemplateInput {
  return {
    name,
    description: template.description,
    baseImage: template.baseImage,
    vCpu: template.vCpu,
    memoryGb: template.memoryGb,
    diskSizeGb: template.diskSizeGb,
    preinstalledTools: template.preinstalledTools,
  };
}

function makeTemplateCopyName(template: VMTemplate, templates: VMTemplate[]) {
  const usedNames = new Set(templates.map((item) => item.name.toLowerCase()));
  const baseName = `${template.name} Copy`;
  let candidate = baseName;
  let index = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${index}`;
    index += 1;
  }

  return candidate;
}

function formatUsageCount(count: number | null) {
  if (count === null) return "VM usage loading";
  if (count === 0) return "No VMs using this";
  return `${count} ${count === 1 ? "VM" : "VMs"} using this`;
}

function isSystemTemplate(template: VMTemplate) {
  return !template.id.startsWith("tpl_custom_");
}

function getDeleteBlocker(template: VMTemplate, usageCount: number | null) {
  if (isSystemTemplate(template)) return "System templates cannot be deleted.";
  if (usageCount === null) return "VM usage is still loading.";
  if (usageCount > 0) return `${template.name} is used by ${usageCount} ${usageCount === 1 ? "VM" : "VMs"}.`;
  return null;
}

export function AdminTemplatesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/templates" });
  const { create } = useSearch({ from: "/authenticated/admin/templates" });
  const [editing, setEditing] = useState<VMTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const templatesQuery = useQuery({
    queryKey: queryKeys.adminTemplates,
    queryFn: adminApi.getTemplates,
  });

  const inventoryQuery = useQuery({
    queryKey: queryKeys.adminInventory,
    queryFn: adminApi.getInventory,
  });

  const isDrawerOpen = creating || Boolean(editing);
  const shouldCreateFromSearch = create === "template";
  const templates = templatesQuery.data ?? [];
  const templateUseCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const vm of inventoryQuery.data ?? []) {
      counts.set(vm.templateId, (counts.get(vm.templateId) ?? 0) + 1);
    }

    return counts;
  }, [inventoryQuery.data]);

  useEffect(() => {
    if (!shouldCreateFromSearch) return;

    setEditing(null);
    setCreating(true);
  }, [shouldCreateFromSearch]);

  function clearCreateSearch() {
    if (!shouldCreateFromSearch) return;
    void navigate({ search: {}, replace: true });
  }

  function openCreateDrawer() {
    setEditing(null);
    setCreating(true);
  }

  function closeDrawer() {
    setCreating(false);
    setEditing(null);
    clearCreateSearch();
  }

  const duplicateMutation = useMutation({
    mutationFn: (template: VMTemplate) =>
      adminApi.createTemplate(toTemplateInput(template, makeTemplateCopyName(template, templates))),
    onSuccess: (createdTemplate) => {
      queryClient.setQueryData<VMTemplate[]>(queryKeys.adminTemplates, (current) => [createdTemplate, ...(current ?? [])]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTemplates });
      setCreating(false);
      setEditing(createdTemplate);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (template: VMTemplate) => adminApi.deleteTemplate(template.id),
    onSuccess: ({ id }) => {
      queryClient.setQueryData<VMTemplate[]>(queryKeys.adminTemplates, (current) => current?.filter((template) => template.id !== id) ?? []);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTemplates });
      setEditing((current) => (current?.id === id ? null : current));
      setCreating(false);
    },
  });

  const actionError = duplicateMutation.isError
    ? "Could not duplicate template. Try again."
    : deleteMutation.isError
      ? "Could not delete template. System or active templates must stay available."
      : null;

  function requestDeleteTemplate(template: VMTemplate, usageCount: number | null) {
    if (getDeleteBlocker(template, usageCount)) return;

    if (window.confirm(`Delete ${template.name}? This cannot be undone.`)) {
      deleteMutation.mutate(template);
    }
  }

  const filteredTemplates = useMemo(() => {
    const searchTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (searchTokens.length === 0) return templates;

    return templates.filter((template) => {
      const searchable = [
        template.name,
        template.description,
        template.baseImage,
        template.vCpu,
        template.memoryGb,
        template.diskSizeGb,
        ...template.preinstalledTools,
      ]
        .join(" ")
        .toLowerCase();

      return searchTokens.every((token) => searchable.includes(token));
    });
  }, [query, templates]);

  if (templatesQuery.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56 rounded-lg" />
        ))}
      </div>
    );
  }

  if (templatesQuery.isError) {
    return <ErrorState onRetry={() => void templatesQuery.refetch()} />;
  }

  return (
    <>
      {templates.length === 0 ? (
        <EmptyState title="No templates" description="Create the first approved VM template for developer provisioning." actionLabel="Create template" onAction={openCreateDrawer} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Template catalog</h2>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                {filteredTemplates.length} of {templates.length} templates visible.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-[minmax(220px,1fr)_auto]">
              <Input
                aria-label="Search templates"
                placeholder="Search name, image, tools..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button variant="primary" onClick={openCreateDrawer}>Create template</Button>
            </div>
          </div>
          {actionError ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {actionError}
            </div>
          ) : null}

          {filteredTemplates.length === 0 ? (
            <EmptyState title="No templates match this search" description="Try another template name, base image, size or installed tool." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => {
                const usageCount = inventoryQuery.isSuccess ? (templateUseCounts.get(template.id) ?? 0) : null;

                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    usageCount={usageCount}
                    isDuplicating={duplicateMutation.isPending && duplicateMutation.variables?.id === template.id}
                    onDuplicate={() => duplicateMutation.mutate(template)}
                    onEdit={() => setEditing(template)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      <Drawer
        open={isDrawerOpen}
        title={editing ? "Edit template" : "Create template"}
        description="Changes are reflected in the template list."
        onClose={closeDrawer}
      >
        <TemplateForm
          template={editing}
          usageCount={editing && inventoryQuery.isSuccess ? (templateUseCounts.get(editing.id) ?? 0) : null}
          isDeleting={deleteMutation.isPending && deleteMutation.variables?.id === editing?.id}
          onDelete={() => {
            if (editing) requestDeleteTemplate(editing, inventoryQuery.isSuccess ? (templateUseCounts.get(editing.id) ?? 0) : null);
          }}
          onDone={closeDrawer}
        />
      </Drawer>
    </>
  );
}

function TemplateUsagePill({ count }: { count: number | null }) {
  return (
    <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500 tabular-nums dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
      {formatUsageCount(count)}
    </span>
  );
}

function TemplateCard({
  template,
  usageCount,
  isDuplicating,
  onDuplicate,
  onEdit,
}: {
  template: VMTemplate;
  usageCount: number | null;
  isDuplicating: boolean;
  onDuplicate: () => void;
  onEdit: () => void;
}) {
  const specs = [
    { label: "CPU", value: template.vCpu, unit: "vCPU" },
    { label: "Memory", value: template.memoryGb, unit: "GB" },
    { label: "Disk", value: template.diskSizeGb, unit: "GB" },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{template.name}</CardTitle>
            <CardDescription className="truncate">{template.baseImage}</CardDescription>
          </div>
          <TemplateUsagePill count={usageCount} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p className="min-h-10 overflow-hidden text-[13px] leading-5 text-gray-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-gray-400">
          {template.description}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="min-w-0 rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <dt className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-500">{spec.label}</dt>
              <dd className="mt-1.5 flex min-w-0 items-baseline gap-1 text-gray-900 dark:text-gray-100">
                <span className="tabular-nums text-[20px] font-semibold leading-none">{spec.value}</span>
                <span className="min-w-0 text-[11px] font-medium text-gray-500 dark:text-gray-400">{spec.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {template.preinstalledTools.map((tool) => (
            <Badge key={tool} tone="brand">{tool}</Badge>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`Edit ${template.name}`}>
            <Edit03 className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={isDuplicating}
            onClick={onDuplicate}
            aria-label={`Duplicate ${template.name}`}
          >
            {!isDuplicating ? <Copy01 className="size-3.5" strokeWidth={1.8} aria-hidden="true" /> : null}
            Duplicate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateForm({
  template,
  usageCount,
  isDeleting,
  onDelete,
  onDone,
}: {
  template: VMTemplate | null;
  usageCount: number | null;
  isDeleting: boolean;
  onDelete: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const initialValue = useMemo<TemplateInput>(() => {
    if (!template) return emptyTemplate;

    return {
      name: template.name,
      description: template.description,
      baseImage: template.baseImage,
      vCpu: template.vCpu,
      memoryGb: template.memoryGb,
      diskSizeGb: template.diskSizeGb,
      preinstalledTools: template.preinstalledTools,
    };
  }, [template]);

  const [form, setForm] = useState<TemplateInput>(initialValue);
  const [toolsText, setToolsText] = useState(initialValue.preinstalledTools.join(", "));
  const deleteBlocker = template ? getDeleteBlocker(template, usageCount) : null;
  const deleteTitle = deleteBlocker ?? (template ? `Delete ${template.name}` : undefined);

  useEffect(() => {
    if (template) return;

    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 30);

    return () => window.clearTimeout(focusTimer);
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (input: TemplateInput) => {
      if (template) return adminApi.updateTemplate(template.id, input);
      return adminApi.createTemplate(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTemplates });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminInventory });
      onDone();
    },
  });

  function update<K extends keyof TemplateInput>(key: K, value: TemplateInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate({
      ...form,
      vCpu: Number(form.vCpu),
      memoryGb: Number(form.memoryGb),
      diskSizeGb: Number(form.diskSizeGb),
      preinstalledTools: toolsText.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input ref={nameInputRef} label="Template name" value={form.name} onChange={(event) => update("name", event.target.value)} required />
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Description</span>
        <textarea
          className="block min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-sans text-[13px] text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950/10 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-white/20 dark:focus:border-gray-100 dark:focus:ring-white/10"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
        />
      </label>
      <Select label="Base image" value={form.baseImage} onChange={(event) => update("baseImage", event.target.value)} required>
        {baseImageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="vCPU" type="number" min={1} max={64} value={form.vCpu} onChange={(event) => update("vCpu", Number(event.target.value))} required />
        <Input label="Memory GB" type="number" min={2} max={256} value={form.memoryGb} onChange={(event) => update("memoryGb", Number(event.target.value))} required />
        <Input label="Disk GB" type="number" min={20} max={1024} value={form.diskSizeGb} onChange={(event) => update("diskSizeGb", Number(event.target.value))} required />
      </div>
      <Input
        label="Preinstalled tools"
        hint="Comma separated, for example vscode-server, docker, node"
        value={toolsText}
        onChange={(event) => setToolsText(event.target.value)}
      />
      {saveMutation.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">Could not save template. Try again.</div>
      ) : null}
      <div
        className={cn(
          "flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center",
          template ? "sm:justify-between" : "sm:justify-end",
        )}
      >
        {template ? (
          <span className="inline-flex self-start" title={deleteTitle}>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:border-gray-200 disabled:text-gray-400 dark:border-red-500/20 dark:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:disabled:border-white/10 dark:disabled:text-gray-600"
              loading={isDeleting}
              disabled={Boolean(deleteBlocker) || isDeleting || saveMutation.isPending}
              onClick={onDelete}
              aria-label={`Delete ${template.name}`}
            >
              {!isDeleting ? <Trash01 className="size-3.5" strokeWidth={1.8} aria-hidden="true" /> : null}
              Delete template
            </Button>
          </span>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saveMutation.isPending}>
            {template ? "Save changes" : "Create template"}
          </Button>
        </div>
      </div>
    </form>
  );
}
