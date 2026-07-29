/**
 * Structured JSON logging (Pino-compatible shape) with correlation IDs.
 *
 * SECURITY_AND_PRIVACY.md §7: logs contain IDs and error classes, never task
 * titles, notes, calendar content, tokens, or confirmation numbers. The
 * `redact` helper below is applied to every payload before serialization.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export type LogFields = Record<string, unknown>;

/**
 * Keys whose values must never reach a log sink. Matching is case-insensitive
 * and substring-based so that `googleRefreshToken` and `refresh_token` both hit.
 */
const FORBIDDEN_KEY_PATTERNS = [
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'credential',
  'title',
  'summary',
  'description',
  'notes',
  'note',
  'rawtext',
  'raw_text',
  'email',
  'confirmation',
  'objective',
  'reason',
];

const REDACTED = '[redacted]';

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const lowered = key.toLowerCase();
      if (FORBIDDEN_KEY_PATTERNS.some((pattern) => lowered.includes(pattern))) {
        out[key] = REDACTED;
      } else {
        out[key] = redact(nested, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export interface Logger {
  readonly correlationId: string;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

function thresholdFromEnv(): number {
  const raw = process.env.LOG_LEVEL;
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return LEVEL_ORDER[raw];
  }
  return LEVEL_ORDER.info;
}

export interface CreateLoggerOptions {
  correlationId: string;
  bindings?: LogFields;
  sink?: (line: string) => void;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  const bindings = options.bindings ?? {};
  const threshold = thresholdFromEnv();

  function emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < threshold) return;
    const record = {
      level,
      time: new Date().toISOString(),
      correlationId: options.correlationId,
      msg: message,
      ...(redact(bindings) as LogFields),
      ...(fields ? (redact(fields) as LogFields) : {}),
    };
    sink(JSON.stringify(record));
  }

  return {
    correlationId: options.correlationId,
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
    child: (fields) =>
      createLogger({
        correlationId: options.correlationId,
        bindings: { ...bindings, ...fields },
        ...(options.sink ? { sink: options.sink } : {}),
      }),
  };
}

export function newCorrelationId(): string {
  return crypto.randomUUID();
}
