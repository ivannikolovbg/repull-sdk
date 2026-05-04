/**
 * Minimal structural typing for the @repull/sdk surface our components
 * touch. We intentionally do NOT import the real `Repull` class because:
 *
 *  1. Several primitives need methods (`payments`, `tasks`) that may live
 *     on a future SDK release. Structural typing lets the components
 *     compose with whatever the agent's app has wired up — the runtime
 *     check is "does the method exist?".
 *  2. Tests can drop in a plain object mock without instantiating the
 *     real SDK or hitting the network.
 *
 * The contract intentionally keeps every method optional so a partial
 * SDK still typechecks; missing methods raise a friendly empty-state
 * inside the component instead of a runtime crash.
 */

export type ListResponseLike<T> = {
  data: T[];
  pagination?: {
    nextCursor?: string | null;
    hasMore?: boolean;
    total?: number | null;
  };
};

export type ListMethod<T = unknown> = (
  query?: Record<string, unknown>,
) => Promise<ListResponseLike<T>>;

export type GetMethod<T = unknown> = (
  id: string | number,
  opts?: Record<string, unknown>,
) => Promise<T>;

export interface RepullClientLike {
  reservations?: {
    list?: ListMethod;
    get?: GetMethod;
  };
  listings?: {
    list?: ListMethod;
    get?: GetMethod;
    pricing?: {
      get?: (
        listingId: string | number,
        query?: { startDate?: string; endDate?: string },
      ) => Promise<unknown>;
    };
  };
  guests?: {
    list?: ListMethod;
    get?: GetMethod;
  };
  properties?: {
    list?: ListMethod;
    get?: GetMethod;
  };
  payments?: {
    list?: ListMethod;
    connectStatus?: () => Promise<unknown>;
    connect?: (body?: Record<string, unknown>) => Promise<unknown>;
    disconnect?: () => Promise<unknown>;
  };
  tasks?: {
    list?: ListMethod;
    get?: GetMethod;
  };
}

/** Resource keys the DataTable knows how to bind to. */
export type DataTableResource =
  | 'reservations'
  | 'listings'
  | 'guests'
  | 'payments'
  | 'tasks';

/**
 * Pull a list namespace off the client by string key. Returns a callable
 * `list` function or null if the SDK didn't expose it (so the component
 * can render a clean empty state instead of throwing).
 */
export function resolveListMethod(
  client: RepullClientLike | null | undefined,
  resource: DataTableResource,
): ListMethod | null {
  if (!client) return null;
  const ns = (client as Record<string, unknown>)[resource] as
    | { list?: ListMethod }
    | undefined;
  if (!ns || typeof ns.list !== 'function') return null;
  return ns.list.bind(ns);
}
