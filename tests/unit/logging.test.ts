import { describe, expect, it } from 'vitest';
import { createLogger, redact } from '@/lib/logging/logger';

/** SECURITY_AND_PRIVACY.md §7: logs carry IDs and error classes, not content. */

describe('log redaction', () => {
  it('redacts credential-shaped keys at any depth', () => {
    const result = redact({
      accessToken: 'ya29.secret',
      nested: { refresh_token: 'rt', apiKey: 'k', deep: { clientSecret: 's' } },
      arrayOf: [{ authorization: 'Bearer abc' }],
    }) as Record<string, unknown>;

    expect(JSON.stringify(result)).not.toContain('ya29.secret');
    expect(JSON.stringify(result)).not.toContain('Bearer abc');
    expect(result.accessToken).toBe('[redacted]');
  });

  it('redacts user content fields', () => {
    const result = redact({
      taskId: 'abc-123',
      title: 'Therapy appointment',
      description: 'Private note',
      summary: 'Calendar event summary',
      email: 'someone@example.com',
      confirmationNumber: 'ABC123',
    }) as Record<string, unknown>;

    expect(result.taskId).toBe('abc-123');
    expect(result.title).toBe('[redacted]');
    expect(result.description).toBe('[redacted]');
    expect(result.summary).toBe('[redacted]');
    expect(result.email).toBe('[redacted]');
    expect(result.confirmationNumber).toBe('[redacted]');
  });

  it('leaves non-sensitive scalars alone', () => {
    expect(redact({ count: 3, ok: true, status: 'ready' })).toEqual({
      count: 3,
      ok: true,
      status: 'ready',
    });
  });
});

describe('structured logger', () => {
  it('emits one JSON line per record with the correlation id', () => {
    const lines: string[] = [];
    const logger = createLogger({
      correlationId: 'corr-1',
      sink: (line) => lines.push(line),
    });
    logger.error('request_failed', { code: 'NOT_FOUND', title: 'secret title' });

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(record.level).toBe('error');
    expect(record.correlationId).toBe('corr-1');
    expect(record.msg).toBe('request_failed');
    expect(record.code).toBe('NOT_FOUND');
    expect(record.title).toBe('[redacted]');
  });

  it('carries bindings into child loggers and redacts them too', () => {
    const lines: string[] = [];
    const logger = createLogger({
      correlationId: 'corr-2',
      sink: (line) => lines.push(line),
    }).child({ userId: 'u-1', email: 'a@b.c' });
    logger.info('did_thing');

    const record = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(record.userId).toBe('u-1');
    expect(record.email).toBe('[redacted]');
    expect(record.correlationId).toBe('corr-2');
  });

  it('honours the level threshold', () => {
    const previous = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'warn';
    const lines: string[] = [];
    const logger = createLogger({ correlationId: 'c', sink: (line) => lines.push(line) });
    logger.debug('ignored');
    logger.info('ignored');
    logger.warn('kept');
    process.env.LOG_LEVEL = previous;
    expect(lines).toHaveLength(1);
  });
});
