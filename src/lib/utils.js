import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard shadcn/ui helper:
 * merges conditional classnames + tailwind conflict resolution.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
