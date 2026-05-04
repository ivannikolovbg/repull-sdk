import { cn } from './cn.js';

/**
 * Shared skeleton block. Matches the project's UI rule:
 * "Every UI page and component that fetches data MUST have a polished
 * skeleton loading state … mirror the final layout".
 */
export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-white/[0.06]',
        className,
      )}
      {...rest}
    />
  );
}
