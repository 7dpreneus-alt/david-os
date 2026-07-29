/**
 * Typed API error envelope — API_CONTRACTS.md §1.
 */

export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'NOT_FOUND',
  'DEPENDENCY_BLOCKED',
  'BUDGET_BLOCKED',
  'NO_FEASIBLE_SLOT',
  'PROPOSAL_STALE',
  'APPROVAL_REQUIRED',
  'PROVIDER_RECONNECT_REQUIRED',
  'PROVIDER_RATE_LIMITED',
  'SYNC_IN_PROGRESS',
  'FEATURE_DISABLED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: FieldErrors;
    retryable: boolean;
    requestId: string;
  };
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 422,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  NOT_FOUND: 404,
  DEPENDENCY_BLOCKED: 409,
  BUDGET_BLOCKED: 409,
  NO_FEASIBLE_SLOT: 409,
  PROPOSAL_STALE: 409,
  APPROVAL_REQUIRED: 403,
  PROVIDER_RECONNECT_REQUIRED: 409,
  PROVIDER_RATE_LIMITED: 429,
  SYNC_IN_PROGRESS: 409,
  FEATURE_DISABLED: 503,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  'PROVIDER_RATE_LIMITED',
  'RATE_LIMITED',
  'SYNC_IN_PROGRESS',
  'INTERNAL_ERROR',
]);

export function statusForCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function isRetryable(code: ApiErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

/**
 * Domain- and route-level failures throw this so that handlers never have to
 * invent a status code or leak an internal message to the client.
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly fieldErrors: FieldErrors | undefined;
  /** Extra context for server logs only. Never serialized to the client. */
  public readonly logContext: Record<string, unknown> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { fieldErrors?: FieldErrors; logContext?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.logContext = options?.logContext;
  }

  get status(): number {
    return statusForCode(this.code);
  }

  toBody(requestId: string): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
        retryable: isRetryable(this.code),
        requestId,
      },
    };
  }
}

export const unauthenticated = (message = 'You must be signed in.') =>
  new ApiError('UNAUTHENTICATED', message);

export const notFound = (message = 'The requested record was not found.') =>
  new ApiError('NOT_FOUND', message);

export const forbidden = (message = 'You do not have access to this record.') =>
  new ApiError('FORBIDDEN', message);

export const validationError = (fieldErrors: FieldErrors, message = 'The request could not be applied.') =>
  new ApiError('VALIDATION_ERROR', message, { fieldErrors });

export const featureDisabled = (flag: string) =>
  new ApiError('FEATURE_DISABLED', `This feature is not enabled in this environment.`, {
    logContext: { flag },
  });
