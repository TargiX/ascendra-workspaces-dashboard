import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type MenuItemRenderProps,
} from "react-aria-components";
import { cn } from "../../lib/cn";
import { buttonClassName } from "./Button";

export function DropdownMenu({
  label,
  trigger,
  children,
  align = "end",
  disabled = false,
  triggerClassName,
}: {
  label: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  disabled?: boolean;
  triggerClassName?: string;
}) {
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={label}
        className={buttonClassName({ variant: "secondary", size: "icon", className: triggerClassName })}
        isDisabled={disabled}
      >
        {trigger}
      </AriaButton>
      <Popover
        className="z-50 min-w-36 rounded-md border border-gray-200 bg-white p-1 outline-none dark:border-white/10 dark:bg-[#111]"
        offset={4}
        placement={align === "end" ? "bottom end" : "bottom start"}
      >
        <Menu className="outline-none" shouldCloseOnSelect>
          {children}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  disabled = false,
  tone = "default",
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <MenuItem
      className={(state: MenuItemRenderProps) =>
        cn(
          "flex h-8 w-full cursor-default items-center gap-2 rounded px-2 text-left font-sans text-[13px] outline-none transition-colors",
          state.isDisabled && "cursor-not-allowed opacity-50",
          state.isFocused &&
            (tone === "danger" ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-white/5"),
          state.isPressed &&
            (tone === "danger" ? "bg-red-100 dark:bg-red-500/15" : "bg-gray-100 dark:bg-white/10"),
          tone === "danger" ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-200",
        )
      }
      isDisabled={disabled}
      onAction={onSelect}
      textValue={typeof children === "string" ? children : undefined}
    >
      {children}
    </MenuItem>
  );
}
