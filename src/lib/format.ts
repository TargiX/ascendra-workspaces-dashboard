import { format, formatDistanceToNowStrict } from "date-fns";

export function formatCurrency(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0,
    ...options,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatDateTime(value: string) {
  return format(new Date(value), "MMM d, HH:mm");
}

export function relativeTime(value: string) {
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export function formatDuration(minutes: number) {
  if (minutes < 1) return "<1 min";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
