import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XClose } from "@untitledui/icons";
import { Button } from "./Button";
import { focusFirstElement, keepFocusInside } from "../../lib/focus";

export function Drawer({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => focusFirstElement(panelRef.current), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      keepFocusInside(event, panelRef.current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button className="absolute inset-0 cursor-default bg-gray-950/40" onClick={onClose} aria-label="Close drawer" />
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white outline-none dark:border-white/10 dark:bg-[#0a0a0a]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby={description ? "drawer-description" : undefined}
        tabIndex={-1}
      >
        <div className="border-b border-gray-200 px-6 py-5 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="drawer-title" className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              {description ? <p id="drawer-description" className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">{description}</p> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <XClose className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
