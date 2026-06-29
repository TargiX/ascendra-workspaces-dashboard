const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isVisible(element: HTMLElement) {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

export function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const ariaDisabled = element.getAttribute("aria-disabled") === "true";
    return !ariaDisabled && isVisible(element);
  });
}

export function focusFirstElement(container: HTMLElement | null) {
  const firstElement = getFocusableElements(container)[0] ?? container;
  firstElement?.focus();
}

export function keepFocusInside(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
