/**
 * Error classes for @repull/sdk.
 *
 * The Repull API returns a uniform `{ error: { code, message, requestId? } }`
 * payload on 4xx/5xx. The SDK maps that shape onto `RepullError` and its
 * subclasses, with the original status code preserved.
 */

export interface RepullErrorBody {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: unknown;
  };
  message?: string;
  code?: string;
  requestId?: string;
}

export class RepullError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(args: {
    message: string;
    status: number;
    code?: string;
    requestId?: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'RepullError';
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
    this.details = args.details;
  }

  static fromResponse(status: number, body: RepullErrorBody | string | undefined): RepullError {
    let message = `Repull API error (${status})`;
    let code: string | undefined;
    let requestId: string | undefined;
    let details: unknown = undefined;

    if (typeof body === 'string' && body.length > 0) {
      message = body;
    } else if (body && typeof body === 'object') {
      const inner = body.error ?? body;
      if (inner && typeof inner === 'object') {
        const m = (inner as { message?: string }).message;
        if (typeof m === 'string') message = m;
        const c = (inner as { code?: string }).code;
        if (typeof c === 'string') code = c;
        const r = (inner as { requestId?: string }).requestId;
        if (typeof r === 'string') requestId = r;
        const d = (inner as { details?: unknown }).details;
        details = d;
      }
    }

    if (status === 401 || status === 403) {
      return new RepullAuthError({ message, status, code, requestId, details });
    }
    if (status === 429) {
      return new RepullRateLimitError({ message, status, code, requestId, details });
    }
    if (status === 400 || status === 422) {
      return new RepullValidationError({ message, status, code, requestId, details });
    }
    return new RepullError({ message, status, code, requestId, details });
  }
}

export class RepullAuthError extends RepullError {
  constructor(args: { message: string; status: number; code?: string; requestId?: string; details?: unknown }) {
    super(args);
    this.name = 'RepullAuthError';
  }
}

export class RepullRateLimitError extends RepullError {
  constructor(args: { message: string; status: number; code?: string; requestId?: string; details?: unknown }) {
    super(args);
    this.name = 'RepullRateLimitError';
  }
}

export class RepullValidationError extends RepullError {
  constructor(args: { message: string; status: number; code?: string; requestId?: string; details?: unknown }) {
    super(args);
    this.name = 'RepullValidationError';
  }
}
