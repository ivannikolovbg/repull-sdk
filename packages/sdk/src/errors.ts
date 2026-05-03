/**
 * Error classes for @repull/sdk.
 *
 * The Repull API returns a uniform self-documenting envelope on 4xx/5xx:
 *
 *   {
 *     "error": {
 *       "code": "invalid_params",
 *       "message": "...",
 *       "fix": "...",            // exact recovery steps
 *       "docs_url": "...",       // canonical write-up
 *       "request_id": "...",     // mirrors X-Request-ID
 *       "field": "...",          // present when parameter-specific
 *       "value_received": ...,
 *       "valid_values": [...],
 *       "validParams": [...],    // present on `unknown_params`
 *       "endpoint": "...",
 *       "did_you_mean": "...",
 *       "retry_after": 60        // mirrors Retry-After (seconds)
 *     }
 *   }
 *
 * The SDK surfaces every field on `RepullError` so callers (and AI
 * agents) can self-recover without a docs round-trip.
 */

export interface RepullErrorBody {
  error?: {
    code?: string;
    message?: string;
    fix?: string;
    docs_url?: string;
    request_id?: string;
    requestId?: string;
    field?: string;
    value_received?: unknown;
    valueReceived?: unknown;
    valid_values?: string[];
    validValues?: string[];
    validParams?: string[];
    endpoint?: string;
    did_you_mean?: string;
    didYouMean?: string;
    retry_after?: number;
    retryAfter?: number;
    details?: unknown;
    [key: string]: unknown;
  };
  message?: string;
  code?: string;
  requestId?: string;
}

export class RepullError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  /** Exact recovery steps. Surface verbatim in your UI / agent reasoning trace. */
  readonly fix?: string;
  /** Canonical docs URL for this error code. */
  readonly docsUrl?: string;
  /** Body field, query param, or path segment the error is about. */
  readonly field?: string;
  /** Echo of the offending value (truncated server-side to 200 chars). */
  readonly valueReceived?: unknown;
  /** Allowed values when the error is enum-related. */
  readonly validValues?: string[];
  /** Sorted list of every accepted query param. Present on `unknown_params`. */
  readonly validParams?: string[];
  /** The endpoint path that produced the error. Present on `unknown_params`. */
  readonly endpoint?: string;
  /** Suggestion for typos and near-matches. */
  readonly didYouMean?: string;
  /** Seconds the client should wait before retrying (mirrors `Retry-After`). */
  readonly retryAfter?: number;
  readonly details?: unknown;

  constructor(args: {
    message: string;
    status: number;
    code?: string;
    requestId?: string;
    fix?: string;
    docsUrl?: string;
    field?: string;
    valueReceived?: unknown;
    validValues?: string[];
    validParams?: string[];
    endpoint?: string;
    didYouMean?: string;
    retryAfter?: number;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'RepullError';
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
    this.fix = args.fix;
    this.docsUrl = args.docsUrl;
    this.field = args.field;
    this.valueReceived = args.valueReceived;
    this.validValues = args.validValues;
    this.validParams = args.validParams;
    this.endpoint = args.endpoint;
    this.didYouMean = args.didYouMean;
    this.retryAfter = args.retryAfter;
    this.details = args.details;
  }

  static fromResponse(status: number, body: RepullErrorBody | string | undefined): RepullError {
    let message = `Repull API error (${status})`;
    let code: string | undefined;
    let requestId: string | undefined;
    let fix: string | undefined;
    let docsUrl: string | undefined;
    let field: string | undefined;
    let valueReceived: unknown = undefined;
    let validValues: string[] | undefined;
    let validParams: string[] | undefined;
    let endpoint: string | undefined;
    let didYouMean: string | undefined;
    let retryAfter: number | undefined;
    let details: unknown = undefined;

    if (typeof body === 'string' && body.length > 0) {
      message = body;
    } else if (body && typeof body === 'object') {
      const inner = (body.error ?? body) as Record<string, unknown>;
      if (inner && typeof inner === 'object') {
        const m = inner.message;
        if (typeof m === 'string') message = m;
        const c = inner.code;
        if (typeof c === 'string') code = c;
        const r = (inner.request_id ?? inner.requestId);
        if (typeof r === 'string') requestId = r;
        const f = inner.fix;
        if (typeof f === 'string') fix = f;
        const d = (inner.docs_url ?? (inner as { docsUrl?: unknown }).docsUrl);
        if (typeof d === 'string') docsUrl = d;
        const fld = inner.field;
        if (typeof fld === 'string') field = fld;
        const vr = inner.value_received ?? inner.valueReceived;
        if (vr !== undefined) valueReceived = vr;
        const vv = inner.valid_values ?? inner.validValues;
        if (Array.isArray(vv)) validValues = vv as string[];
        const vp = inner.validParams;
        if (Array.isArray(vp)) validParams = vp as string[];
        const ep = inner.endpoint;
        if (typeof ep === 'string') endpoint = ep;
        const dym = inner.did_you_mean ?? inner.didYouMean;
        if (typeof dym === 'string') didYouMean = dym;
        const ra = inner.retry_after ?? inner.retryAfter;
        if (typeof ra === 'number') retryAfter = ra;
        const det = inner.details;
        details = det;
      }
    }

    const args = {
      message,
      status,
      code,
      requestId,
      fix,
      docsUrl,
      field,
      valueReceived,
      validValues,
      validParams,
      endpoint,
      didYouMean,
      retryAfter,
      details,
    };

    if (status === 401 || status === 403) {
      return new RepullAuthError(args);
    }
    if (status === 429) {
      return new RepullRateLimitError(args);
    }
    if (status === 400 || status === 422) {
      return new RepullValidationError(args);
    }
    return new RepullError(args);
  }
}

export class RepullAuthError extends RepullError {
  constructor(args: ConstructorParameters<typeof RepullError>[0]) {
    super(args);
    this.name = 'RepullAuthError';
  }
}

export class RepullRateLimitError extends RepullError {
  constructor(args: ConstructorParameters<typeof RepullError>[0]) {
    super(args);
    this.name = 'RepullRateLimitError';
  }
}

export class RepullValidationError extends RepullError {
  constructor(args: ConstructorParameters<typeof RepullError>[0]) {
    super(args);
    this.name = 'RepullValidationError';
  }
}
