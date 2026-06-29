import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-[#111]">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">∅</div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
