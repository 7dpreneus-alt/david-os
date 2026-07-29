import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUser, withAdmin } from '@/lib/db/session';
import { createTestUser, deleteTestUser, ensureSchema, shutdown, type TestUser } from '../helpers/db';

/**
 * Row-level security proofs — SECURITY_AND_PRIVACY.md §4 and
 * ACCEPTANCE_CRITERIA.md "RLS prevents cross-account access".
 *
 * These run against a real PostgreSQL database with the shipped migrations and
 * the `authenticated` role, which is the same context Supabase applies.
 */

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  await ensureSchema();
  alice = await createTestUser();
  bob = await createTestUser();
}, 60_000);

afterAll(async () => {
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
  await shutdown();
});

describe('RLS is enabled everywhere it must be', () => {
  it('every public table except the migration ledger has RLS enabled', async () => {
    const rows = await withAdmin(async (db) => {
      const result = await db.query<{ tablename: string }>(
        `select t.tablename
           from pg_tables t
           join pg_class c on c.relname = t.tablename
           join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
          where t.schemaname = 'public'
            and t.tablename <> 'schema_migrations'
            and c.relrowsecurity = false`,
      );
      return result.rows.map((row) => row.tablename);
    });
    expect(rows).toEqual([]);
  });

  it('the anon role has no privileges on user data', async () => {
    const rows = await withAdmin(async (db) => {
      const result = await db.query<{ table_name: string }>(
        `select distinct table_name
           from information_schema.role_table_grants
          where grantee = 'anon' and table_schema = 'public'
            and table_name in ('tasks','projects','inbox_items','profiles','decisions')`,
      );
      return result.rows.map((row) => row.table_name);
    });
    expect(rows).toEqual([]);
  });
});

describe('cross-account isolation', () => {
  it('user B cannot read user A rows', async () => {
    await withUser(alice.id, (db) =>
      db.query(`insert into public.tasks (user_id, title) values ($1, 'Alice private task')`, [
        alice.id,
      ]),
    );

    const bobSees = await withUser(bob.id, async (db) => {
      const result = await db.query('select id from public.tasks');
      return result.rowCount;
    });
    expect(bobSees).toBe(0);

    const aliceSees = await withUser(alice.id, async (db) => {
      const result = await db.query('select id from public.tasks');
      return result.rowCount;
    });
    expect(aliceSees).toBeGreaterThan(0);
  });

  it('user B cannot insert a row owned by user A', async () => {
    await expect(
      withUser(bob.id, (db) =>
        db.query(`insert into public.tasks (user_id, title) values ($1, 'Forged')`, [alice.id]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('user B cannot update or delete user A rows', async () => {
    const taskId = await withUser(alice.id, async (db) => {
      const result = await db.query<{ id: string }>(
        `insert into public.tasks (user_id, title) values ($1, 'Alice target') returning id`,
        [alice.id],
      );
      return result.rows[0]?.id ?? '';
    });
    expect(taskId).not.toBe('');

    const updated = await withUser(bob.id, async (db) => {
      const result = await db.query(`update public.tasks set title = 'Hijacked' where id = $1`, [
        taskId,
      ]);
      return result.rowCount;
    });
    expect(updated).toBe(0);

    const deleted = await withUser(bob.id, async (db) => {
      const result = await db.query('delete from public.tasks where id = $1', [taskId]);
      return result.rowCount;
    });
    expect(deleted).toBe(0);

    const stillThere = await withUser(alice.id, async (db) => {
      const result = await db.query<{ title: string }>(
        'select title from public.tasks where id = $1',
        [taskId],
      );
      return result.rows[0]?.title;
    });
    expect(stillThere).toBe('Alice target');
  });

  it('profiles are isolated by id, not user_id', async () => {
    const bobSeesProfiles = await withUser(bob.id, async (db) => {
      const result = await db.query<{ id: string }>('select id from public.profiles');
      return result.rows.map((row) => row.id);
    });
    expect(bobSeesProfiles).toEqual([bob.id]);
  });

  it('sensitive tables are unreadable by the authenticated role', async () => {
    // calendar_connections has RLS enabled with no authenticated policy and all
    // privileges revoked, so even the owner cannot read it directly.
    await expect(
      withUser(alice.id, (db) => db.query('select id from public.calendar_connections')),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      withUser(alice.id, (db) => db.query('select id from public.audit_events')),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      withUser(alice.id, (db) => db.query('select id from public.oauth_states')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('the approvals table is readable by its owner but not writable', async () => {
    await expect(
      withUser(alice.id, (db) => db.query('select id from public.approvals')),
    ).resolves.toBeDefined();

    await expect(
      withUser(alice.id, (db) =>
        db.query(
          `insert into public.approvals (user_id, proposal_id, proposal_hash)
           values ($1, gen_random_uuid(), 'x')`,
          [alice.id],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/i);
  });
});

describe('data survives across sessions', () => {
  it('a task written in one session is readable in a later, separate session', async () => {
    const id = await withUser(alice.id, async (db) => {
      const result = await db.query<{ id: string }>(
        `insert into public.tasks (user_id, title) values ($1, 'Persisted task') returning id`,
        [alice.id],
      );
      return result.rows[0]?.id ?? '';
    });

    const found = await withUser(alice.id, async (db) => {
      const result = await db.query<{ title: string }>(
        'select title from public.tasks where id = $1',
        [id],
      );
      return result.rows[0]?.title ?? null;
    });
    expect(found).toBe('Persisted task');
  });
});
