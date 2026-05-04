import clsx, { type ClassValue } from 'clsx';

/** Classname helper — thin wrapper over clsx for component composition. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
