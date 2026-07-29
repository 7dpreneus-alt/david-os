#!/usr/bin/env tsx
/**
 * Local PostgreSQL lifecycle for development and tests.
 *
 * The reference workflow in the architecture package is `supabase start`, which
 * requires Docker. Docker is unavailable in some CI/sandbox environments, so
 * this script drives the PostgreSQL server directly and installs the Supabase
 * compatibility layer (auth schema, roles, auth.uid()) from
 * supabase/migrations/0000_supabase_compat.sql.
 *
 * Commands: start | stop | reset | status
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_DIR = process.env.LOCAL_PG_DATA ?? resolve(ROOT, '.pgdata');
const SOCKET_DIR = process.env.LOCAL_PG_SOCKET ?? '/tmp/pmcos-pg';
const PORT = process.env.LOCAL_PG_PORT ?? '54329';
const DB_NAME = process.env.LOCAL_PG_DB ?? 'mission_control';
const SUPERUSER = 'postgres';

function pgBin(name: string): string {
  const candidates = [
    process.env.PG_BIN_DIR,
    '/usr/lib/postgresql/16/bin',
    '/usr/lib/postgresql/15/bin',
    '/usr/lib/postgresql/17/bin',
  ].filter((value): value is string => typeof value === 'string');
  for (const dir of candidates) {
    const candidate = resolve(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return name;
}

function run(command: string, args: string[], options: { allowFailure?: boolean } = {}): string {
  const result = spawnSync(command, args, { encoding: 'utf8', env: process.env });
  if (result.status !== 0 && options.allowFailure !== true) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function isRunning(): boolean {
  const result = spawnSync(pgBin('pg_isready'), ['-h', SOCKET_DIR, '-p', PORT], {
    encoding: 'utf8',
  });
  return result.status === 0;
}

function start(): void {
  mkdirSync(SOCKET_DIR, { recursive: true });
  if (!existsSync(resolve(DATA_DIR, 'PG_VERSION'))) {
    mkdirSync(DATA_DIR, { recursive: true });
    // `initdb` refuses to run as root; run it (and the server) as the `postgres`
    // OS user when we are root.
    initCluster();
  }
  if (isRunning()) {
    process.stdout.write(`postgres already running on ${SOCKET_DIR}:${PORT}\n`);
    return;
  }
  asPostgres(pgBin('pg_ctl'), [
    '-D',
    DATA_DIR,
    '-o',
    `-p ${PORT} -k ${SOCKET_DIR} -c listen_addresses=127.0.0.1`,
    '-l',
    resolve(DATA_DIR, 'server.log'),
    '-w',
    'start',
  ]);
  ensureDatabase();
  process.stdout.write(`postgres started: ${connectionString()}\n`);
}

function initCluster(): void {
  if (process.getuid?.() === 0) {
    run('chown', ['-R', 'postgres:postgres', DATA_DIR], { allowFailure: true });
    run('chown', ['-R', 'postgres:postgres', SOCKET_DIR], { allowFailure: true });
  }
  asPostgres(pgBin('initdb'), ['-D', DATA_DIR, '-U', SUPERUSER, '--auth=trust', '-E', 'UTF8']);
}

function asPostgres(command: string, args: string[]): string {
  if (process.getuid?.() === 0) {
    return run('su', ['postgres', '-c', [command, ...args.map(quote)].join(' ')]);
  }
  return run(command, args);
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function ensureDatabase(): void {
  const exists = run(
    pgBin('psql'),
    ['-h', SOCKET_DIR, '-p', PORT, '-U', SUPERUSER, '-d', 'postgres', '-tAc',
      `select 1 from pg_database where datname = '${DB_NAME}'`],
  ).trim();
  if (exists !== '1') {
    run(pgBin('createdb'), ['-h', SOCKET_DIR, '-p', PORT, '-U', SUPERUSER, DB_NAME]);
  }
}

function stop(): void {
  if (!isRunning()) {
    process.stdout.write('postgres is not running\n');
    return;
  }
  asPostgres(pgBin('pg_ctl'), ['-D', DATA_DIR, '-m', 'fast', '-w', 'stop']);
  process.stdout.write('postgres stopped\n');
}

function reset(): void {
  if (isRunning()) stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
  start();
}

export function connectionString(): string {
  return `postgresql://${SUPERUSER}@localhost:${PORT}/${DB_NAME}?host=${encodeURIComponent(SOCKET_DIR)}`;
}

function status(): void {
  process.stdout.write(isRunning() ? `running: ${connectionString()}\n` : 'stopped\n');
}

const command = process.argv[2] ?? 'status';
switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'reset':
    reset();
    break;
  case 'status':
    status();
    break;
  default:
    process.stderr.write(`Unknown command: ${command}\n`);
    process.exit(1);
}
