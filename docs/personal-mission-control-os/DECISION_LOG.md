# Decision Log

This file records approved architecture decisions. Implementation-specific changes add new entries; do not silently rewrite history.

## Decision template

```text
ID:
Date:
Status: proposed | accepted | superseded | rejected
Decision:
Context:
Alternatives considered:
Reason:
Expected outcome:
Actual outcome:
Revisit trigger/date:
Related files:
```

## D-001 Modular monolith

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Use one Next.js application plus Supabase PostgreSQL rather than microservices.

**Context:** The product is single-user-first and must stay maintainable and inexpensive.

**Alternatives:** Separate planner, sync, notification, and opportunity services.

**Reason:** Separate services add credentials, deployment surfaces, eventual consistency, and operating burden before scale requires them.

**Expected outcome:** Faster delivery with clear in-code domain boundaries.

**Revisit:** Sustained independent scaling or security-isolation need.

## D-002 Internal tasks and Google events have separate ownership

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Google owns provider event facts; Mission Control owns task intent, planning metadata, proposals, approvals, and recovery.

**Reason:** Conflating a task with an event causes deletion, flexibility, and completion errors.

**Expected outcome:** Safer sync and clearer conflict behavior.

## D-003 Deterministic engines before LLM recommendations

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Priority, capacity, scheduling, and recovery rules operate without an LLM.

**Alternatives:** Model-first planner.

**Reason:** Core behavior must be testable, explainable, inexpensive, and available during model/provider failure.

**Expected outcome:** Stable recommendations and auditable rule changes.

**Revisit:** An LLM may improve explanation or classification after deterministic gates pass.

## D-004 Approval-gate material external writes

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Calendar writes, messages, purchases, bookings, submissions, and destructive bulk actions require explicit approval; purchases and submissions remain prohibited.

**Expected outcome:** No hidden side effects during early trust-building.

## D-005 Supabase Auth and RLS

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Use Supabase Auth and RLS on all exposed relations.

**Alternatives:** Auth.js with custom identity tables; Clerk.

**Reason:** Supabase identity integrates directly with PostgreSQL authorization and reduces the number of core vendors.

**Revisit:** Enterprise identity or provider limitation.

## D-006 Encrypt OAuth refresh tokens at application layer

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Use authenticated encryption with versioned server-held keys before database storage.

**Reason:** Database-at-rest encryption alone does not sufficiently isolate high-value refresh tokens from broad database access.

## D-007 Next.js 16.2 patched stable and Node 24 LTS

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Pin patched stable releases; avoid preview/canary builds.

**Reason:** Current stable platform with security maintenance and predictable deployment.

**Revisit:** Major upgrade only through tested migration proposal.

## D-008 Phase 1 offline scope is capture and cached state only

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Support installability, cached last daily state, and queued rapid capture. Defer arbitrary offline editing.

**Reason:** Full offline synchronization introduces conflict resolution disproportionate to initial value.

## D-009 Vercel Cron plus PostgreSQL job ledger for Phase 2

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Use Vercel Cron only as a trigger; PostgreSQL owns job idempotency, lease, retry, and status.

**Alternatives:** Dedicated workflow provider from day one.

**Reason:** Keeps deployment simple while avoiding unreliable “cron equals durable job” assumptions.

**Revisit:** Long-running workflows exceed serverless limits or operational volume justifies a workflow service.

## D-010 Opportunity Radar is Phase 3

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** No broad opportunity automation before daily core, job controls, notifications, provenance, and prompt-injection defenses work.

**Reason:** Opportunity feeds are noisy and security-sensitive; they can easily distract from core responsibilities.

## D-011 Houston trip data remains unverified starter data

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Include an editable Houston wedding trip without active dates or automatic deadlines until confirmed.

**Reason:** Prior date information conflicts. False deadlines would undermine trust.

## D-012 Second bedroom remains undecided

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Provide a weighted, revisitable decision framework for workspace, workout, guest, rental, and hybrid options.

**Reason:** Income potential is only one factor; privacy, lifestyle, cost, effort, flexibility, and reversibility matter.

## D-013 Paper-trading-only starter learning track

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Trading starter data supports structured paper education and a financial firewall. It does not schedule live trades or connect a brokerage.

**Reason:** The mission-control product should improve learning consistency without creating financial risk.

## D-014 Unknown values are explicit

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** Unknown dates, costs, durations, eligibility, and status remain null/unverified rather than defaulting to zero or inferred truth.

**Expected outcome:** Lower automation confidence but higher operational integrity.

## D-015 At most three dominant priorities

**Date:** 2026-07-28  
**Status:** accepted

**Decision:** The Command Center may show secondary work, but only three items receive dominant-outcome status.

**Reason:** A list of ten “top” priorities is a list with a costume on.
