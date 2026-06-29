import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        {eyebrow ? <p className="text-[13px] font-semibold text-brand-600 dark:text-brand-500">{eyebrow}</p> : null}
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] leading-5 text-gray-500 dark:text-gray-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
