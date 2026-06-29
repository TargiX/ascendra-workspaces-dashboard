import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, leadingIcon, className, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label ? generatedId : undefined);

  return (
    <label className="block" htmlFor={inputId}>
      {label ? <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">{label}</span> : null}
      <span className="relative block">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 text-gray-400 dark:text-gray-600">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "block h-8 w-full rounded-md border border-gray-300 bg-white px-3 font-sans text-[13px] text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-white/20 dark:focus:border-gray-100 dark:focus:ring-white/10 dark:disabled:bg-white/5",
            leadingIcon && "pl-8",
            className,
          )}
          {...props}
        />
      </span>
      {hint ? <span className="mt-1.5 block text-xs text-gray-500 dark:text-gray-400">{hint}</span> : null}
    </label>
  );
});

Input.displayName = "Input";
