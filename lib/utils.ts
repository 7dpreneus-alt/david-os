import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a duration in minutes as "1h 30m" / "45m". */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'no estimate';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatCents(cents: number | null, currency = 'USD'): string {
  if (cents === null) return 'unknown';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
