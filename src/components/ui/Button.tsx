import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-gray-950 bg-gray-950 text-white hover:border-gray-800 hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950 dark:hover:border-white dark:hover:bg-white dark:disabled:border-white/10 dark:disabled:bg-white/10 dark:disabled:text-gray-600",
  secondary:
    "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950 disabled:bg-gray-50 disabled:text-gray-400 dark:border-white/10 dark:bg-[#111] dark:text-gray-200 dark:hover:border-white/20 dark:hover:bg-[#1a1a1a] dark:hover:text-white dark:disabled:bg-[#111]/50 dark:disabled:text-gray-600",
  ghost: "border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-400 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100",
  danger: "border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:border-red-200 disabled:bg-red-200 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 gap-1 rounded-md px-2.5 text-[13px] leading-[18px]",
  md: "h-8 gap-1.5 rounded-md px-3 text-[13px] leading-[18px]",
  lg: "h-9 gap-2 rounded-md px-4 text-sm leading-5",
  icon: "size-8 rounded-md p-0",
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 appearance-none items-center justify-center border font-sans font-medium whitespace-nowrap no-underline transition-colors duration-150 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-100 dark:focus-visible:ring-offset-[#0a0a0a]",
    sizeClasses[size],
    variantClasses[variant],
    className,
  );
}

export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <ButtonSpinner /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    return (
      <a ref={ref} className={buttonClassName({ variant, size, className })} {...props}>
        {children}
      </a>
    );
  },
);

ButtonLink.displayName = "ButtonLink";
