import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { requireUser, type AuthenticatedUser } from '@/lib/auth';
import { createLogger, newCorrelationId, type Logger } from '@/lib/logging/logger';
import { toFieldErrors } from '@/lib/validation/common';
import { ApiError, type ApiErrorBody } from './errors';

/**
 * API route plumbing — API_CONTRACTS.md §1.
 *
 * Provides the success/error envelopes, correlation IDs, structured request
 * logging, Zod body validation, and idempotency-key handling so individual
 * routes contain domain logic only.
 */

export interface SuccessEnvelope<T> {
  data: T;
  warnings: Array<{ code: string; message: string; field?: string }>;
  meta: { requestId: string; asOf: string; stateChanged: boolean };
}

export interface RouteContext {
  user: AuthenticatedUser;
  logger: Logger;
  requestId: string;
  /** Client-supplied Idempotency-Key, or a generated one for safe methods. */
  idempotencyKey: string;
  request: Request;
  params: Record<string, string>;
}

export function success<T>(
  data: T,
  options: {
    requestId: string;
    warnings?: SuccessEnvelope<T>['warnings'];
    stateChanged?: boolean;
    status?: number;
  },
): NextResponse<SuccessEnvelope<T>> {
  return NextResponse.json(
    {
      data,
      warnings: options.warnings ?? [],
      meta: {
        requestId: options.requestId,
        asOf: new Date().toISOString(),
        stateChanged: options.stateChanged ?? false,
      },
    },
    { status: options.status ?? 200 },
  );
}

function errorResponse(error: ApiError, requestId: string): NextResponse<ApiErrorBody> {
  return NextResponse.json(error.toBody(requestId), { status: error.status });
}

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export interface HandlerOptions {
  /** Set false for public routes such as health checks. */
  requireAuth?: boolean;
  /** Require an Idempotency-Key header on mutations. */
  requireIdempotencyKey?: boolean;
}

type Handler = (context: RouteContext) => Promise<NextResponse>;

/**
 * Wrap a route handler with auth, logging, and the typed error envelope.
 *
 * Unexpected errors are logged with their class and correlation ID and returned
 * as INTERNAL_ERROR. The original message is never sent to the client.
 */
export function handler(
  fn: Handler,
  options: HandlerOptions = {},
): (
  request: Request,
  routeContext: { params: Promise<Record<string, string>> },
) => Promise<NextResponse> {
  return async (request, routeContext) => {
    const correlationId =
      request.headers.get('x-correlation-id') ?? newCorrelationId();
    const logger = createLogger({
      correlationId,
      bindings: { method: request.method, path: new URL(request.url).pathname },
    });
    const started = Date.now();

    try {
      const params = routeContext?.params ? await routeContext.params : {};

      const headerKey = request.headers.get('idempotency-key');
      if (
        options.requireIdempotencyKey === true &&
        MUTATION_METHODS.has(request.method) &&
        headerKey === null
      ) {
        throw new ApiError(
          'VALIDATION_ERROR',
          'This request requires an Idempotency-Key header.',
        );
      }

      const user =
        options.requireAuth === false
          ? ({ id: '', email: '', displayName: null } satisfies AuthenticatedUser)
          : await requireUser();

      const response = await fn({
        user,
        logger: options.requireAuth === false ? logger : logger.child({ userId: user.id }),
        requestId: correlationId,
        idempotencyKey: headerKey ?? newCorrelationId(),
        request,
        params,
      });

      response.headers.set('x-correlation-id', correlationId);
      logger.info('request_completed', {
        status: response.status,
        durationMs: Date.now() - started,
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        logger.warn('request_failed', {
          code: error.code,
          durationMs: Date.now() - started,
          ...(error.logContext ?? {}),
        });
        return errorResponse(error, correlationId);
      }
      if (error instanceof ZodError) {
        const apiError = new ApiError(
          'VALIDATION_ERROR',
          'The request could not be applied.',
          { fieldErrors: toFieldErrors(error) },
        );
        logger.warn('request_invalid', { durationMs: Date.now() - started });
        return errorResponse(apiError, correlationId);
      }
      // Unexpected. Log the error class, not the payload.
      logger.error('request_errored', {
        errorClass: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : 'unknown',
        durationMs: Date.now() - started,
      });
      return errorResponse(
        new ApiError('INTERNAL_ERROR', 'Something went wrong on our side.'),
        correlationId,
      );
    }
  };
}

/** Parse and validate a JSON body, throwing VALIDATION_ERROR on failure. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (error) {
    void error;
    throw new ApiError('VALIDATION_ERROR', 'The request body must be valid JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'The request could not be applied.', {
      fieldErrors: toFieldErrors(parsed.error),
    });
  }
  return parsed.data;
}

/** Parse and validate URL search params. */
export function parseQuery<T>(request: Request, schema: ZodType<T>, raw: unknown): T {
  void request;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'The query could not be applied.', {
      fieldErrors: toFieldErrors(parsed.error),
    });
  }
  return parsed.data;
}
