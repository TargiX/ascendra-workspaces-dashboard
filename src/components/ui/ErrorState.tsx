import { Button } from "./Button";

export function ErrorState({ title = "Could not load data", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-lg font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-400">!</div>
      <h3 className="mt-4 text-base font-semibold text-red-950 dark:text-red-300">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-700 dark:text-red-400">{description ?? "The request failed. Try again."}</p>
      {onRetry ? (
        <Button className="mt-5" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
