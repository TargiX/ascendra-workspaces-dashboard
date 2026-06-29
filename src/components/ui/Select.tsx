import {
  Button as AriaButton,
  Label as AriaLabel,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  type ListBoxItemRenderProps,
  type SelectRenderProps,
} from "react-aria-components";
import { Check, ChevronDown } from "@untitledui/icons";
import { Children, isValidElement, type OptionHTMLAttributes, type ReactElement, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/cn";

type NativeOptionElement = ReactElement<OptionHTMLAttributes<HTMLOptionElement>, "option">;

type SelectChangeEvent = {
  currentTarget: { value: string };
  target: { value: string };
};

interface SelectProps {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  name?: string;
  onChange?: (event: SelectChangeEvent) => void;
  placeholder?: string;
  required?: boolean;
  value?: string;
}

type ParsedOption = {
  disabled: boolean;
  label: ReactNode;
  textValue: string;
  value: string;
};

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return getNodeText(node.props.children);
  return "";
}

function isOptionElement(node: ReactNode): node is NativeOptionElement {
  return isValidElement(node) && node.type === "option";
}

function parseOptions(children: ReactNode): ParsedOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isOptionElement(child)) return [];

    const label = child.props.label ?? child.props.children;
    const textValue = String(child.props.label ?? getNodeText(child.props.children)).trim();
    const value = child.props.value == null ? textValue : String(child.props.value);

    return {
      disabled: Boolean(child.props.disabled),
      label,
      textValue,
      value,
    };
  });
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      "aria-label": ariaLabel,
      children,
      className,
      defaultValue,
      disabled = false,
      id,
      label,
      name,
      onChange,
      placeholder = "Select an option",
      required = false,
      value,
    },
    ref,
  ) => {
    const options = parseOptions(children);

    return (
      <AriaSelect
        ref={ref}
        id={id}
        name={name}
        aria-label={label ? undefined : ariaLabel}
        className={(state: SelectRenderProps) =>
          cn("group/select block w-full", disabled && "cursor-not-allowed", className, state.isInvalid && "text-red-700")
        }
        selectedKey={value}
        defaultSelectedKey={defaultValue}
        isDisabled={disabled}
        isRequired={required}
        placeholder={placeholder}
        onSelectionChange={(key) => {
          if (key == null) return;
          const nextValue = String(key);
          onChange?.({
            currentTarget: { value: nextValue },
            target: { value: nextValue },
          });
        }}
      >
        {label ? (
          <AriaLabel className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
            {label}
          </AriaLabel>
        ) : null}
        <AriaButton
          className={(state) =>
            cn(
              "group flex h-8 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-0 font-sans text-[13px] leading-[18px] text-gray-900 shadow-[0_1px_1px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow,background-color,color]",
              "hover:border-gray-400 hover:bg-gray-50/70",
              "focus-visible:border-gray-950 focus-visible:ring-2 focus-visible:ring-gray-950/10",
              "group-data-[open]/select:border-gray-950 group-data-[open]/select:ring-2 group-data-[open]/select:ring-gray-950/10",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none",
              "dark:border-white/10 dark:bg-[#0a0a0a] dark:text-gray-100 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/[0.03] dark:focus-visible:border-gray-100 dark:focus-visible:ring-white/10 dark:group-data-[open]/select:border-gray-100 dark:group-data-[open]/select:ring-white/10 dark:disabled:bg-white/5",
              state.isPressed && "border-gray-950 bg-gray-50 dark:border-gray-100 dark:bg-white/[0.06]",
            )
          }
        >
          <SelectValue
            className={(state) =>
              cn(
                "flex min-w-0 flex-1 items-center truncate text-left text-[13px] leading-[18px]",
                state.isPlaceholder && "text-gray-400 dark:text-gray-600",
              )
            }
          >
            {(state) => (state.isPlaceholder ? placeholder : state.selectedText)}
          </SelectValue>
          <ChevronDown
            className="size-4 shrink-0 text-gray-400 transition-transform group-data-[open]/select:rotate-180 dark:text-gray-500"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </AriaButton>
        <Popover
          offset={5}
          placement="bottom start"
          className="z-50 max-h-72 min-w-[var(--trigger-width)] overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-[0_12px_32px_rgba(0,0,0,0.14)] outline-none dark:border-white/10 dark:bg-[#111] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <ListBox className="outline-none" items={options}>
            {(option) => (
              <ListBoxItem
                id={option.value}
                textValue={option.textValue}
                isDisabled={option.disabled}
                className={(state: ListBoxItemRenderProps) =>
                  cn(
                    "group flex h-8 cursor-default items-center justify-between gap-3 rounded px-2 py-0 font-sans text-[13px] leading-[18px] outline-none transition-colors",
                    state.isDisabled && "cursor-not-allowed opacity-45",
                    state.isFocused && "bg-gray-100 text-gray-950 dark:bg-white/10 dark:text-white",
                    state.isHovered && !state.isFocused && "bg-gray-50 dark:bg-white/[0.06]",
                    state.isSelected && "text-gray-950 dark:text-white",
                    !state.isSelected && "text-gray-700 dark:text-gray-200",
                  )
                }
              >
                {(state) => (
                  <>
                    <span className="block min-w-0 truncate text-[13px] leading-[18px]">{option.label}</span>
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center text-gray-950 dark:text-white",
                        !state.isSelected && "opacity-0",
                      )}
                    >
                      <Check className="size-4" strokeWidth={2} aria-hidden="true" />
                    </span>
                  </>
                )}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </AriaSelect>
    );
  },
);

Select.displayName = "Select";
