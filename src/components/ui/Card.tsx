import { cn } from "../../lib/cn";

type CardHighlight = "warning" | "danger" | "brand";

const highlightClasses: Record<CardHighlight, string> = {
  warning: "border-amber-200 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5",
  danger: "border-red-200 bg-red-50/30 dark:border-red-500/20 dark:bg-red-500/5",
  brand: "border-brand-200 bg-brand-50/30 dark:border-brand-500/20 dark:bg-brand-500/5",
};

export function Card({
  children,
  className,
  hoverable = false,
  highlight,
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  highlight?: CardHighlight;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-[#111]",
        hoverable && "transition-colors duration-150 hover:border-gray-300 dark:hover:border-white/20",
        highlight && highlightClasses[highlight],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border-b border-gray-200 px-4 py-3 dark:border-white/10", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-[15px] font-semibold text-gray-900 dark:text-gray-100", className)}>{children}</h2>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-[13px] text-gray-500 dark:text-gray-400", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
