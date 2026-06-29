import { InfoCircle } from "@untitledui/icons";
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { buttonClassName } from "../../components/ui/Button";
import type { VMTemplate } from "../../domain/types";

export function TemplateInfoPopover({ template }: { template: VMTemplate }) {
  return (
    <DialogTrigger>
      <AriaButton
        aria-label={`View ${template.name} template details`}
        className={buttonClassName({
          variant: "ghost",
          size: "icon",
          className: "size-6 rounded text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200",
        })}
      >
        <InfoCircle className="size-3.5" strokeWidth={2} aria-hidden="true" />
      </AriaButton>
      <Popover
        className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white p-3 outline-none dark:border-white/10 dark:bg-[#111]"
        offset={6}
        placement="bottom start"
      >
        <Dialog className="outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-950 dark:text-gray-100">{template.name}</p>
              <p className="mt-0.5 font-mono text-[12px] text-gray-500 dark:text-gray-400">{template.baseImage}</p>
            </div>
            <span className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:border-white/10 dark:text-gray-300">
              {template.vCpu} vCPU
            </span>
          </div>

          <p className="mt-2 text-[12px] leading-5 text-gray-600 dark:text-gray-400">{template.description}</p>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">
            <div className="px-2 py-2">
              <dt className="text-[11px] text-gray-500 dark:text-gray-500">CPU</dt>
              <dd className="mt-0.5 font-mono text-[12px] text-gray-900 dark:text-gray-100">{template.vCpu}</dd>
            </div>
            <div className="px-2 py-2">
              <dt className="text-[11px] text-gray-500 dark:text-gray-500">Memory</dt>
              <dd className="mt-0.5 font-mono text-[12px] text-gray-900 dark:text-gray-100">
                {template.memoryGb} GB
              </dd>
            </div>
            <div className="px-2 py-2">
              <dt className="text-[11px] text-gray-500 dark:text-gray-500">Disk</dt>
              <dd className="mt-0.5 font-mono text-[12px] text-gray-900 dark:text-gray-100">
                {template.diskSizeGb} GB
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.preinstalledTools.map((tool) => (
              <span
                key={tool}
                className="rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:border-white/10 dark:text-gray-300"
              >
                {tool}
              </span>
            ))}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
