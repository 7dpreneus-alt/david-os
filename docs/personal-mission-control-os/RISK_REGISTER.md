# Risk Register

Scales: Probability and Impact are Low, Medium, High, or Critical. Severity is derived from both and product context.

| ID | Risk | Probability | Impact | Mitigation | Trigger / Detection | Owner | Phase |
|---|---|---|---|---|---|---|---|
| R-01 | Scope expands into an everything app | High | High | Enforce phase gates and milestone exit criteria | New module proposed before Phase 1 gate | Product lead | All |
| R-02 | Dashboard uses fake/sample data during backend failure | Medium | Critical | No fallback; labeled starter data only; E2E outage test | Backend error with populated UI | Architect/QA | 1 |
| R-03 | Cross-user data exposure | Low | Critical | RLS, server ownership checks, pgTAP negative tests | Any cross-user row returned | Security | 1 |
| R-04 | OAuth tokens leak | Low | Critical | App-layer encryption, log redaction, client bundle scan, key rotation | Token-shaped value in logs/build | Security | 1 |
| R-05 | Calendar sync creates duplicates | Medium | High | Provider identity unique key, leases, idempotent upsert, real retry tests | Duplicate provider identity or count drift | Calendar lead | 1–2 |
| R-06 | Invalid sync token causes data loss or duplicates | Medium | High | Controlled full resync and reconciliation | HTTP 410 or ACL change | Calendar lead | 1–2 |
| R-07 | Timezone/DST bug misplaces commitments | Medium | High | UTC + IANA model, all-day dates, DST matrix | Offset mismatch, DST transition | Calendar/QA | 1 |
| R-08 | Proposal approved against stale provider state | Medium | High | ETag/refetch/conflict recheck, expiration | Event changed after proposal | Calendar lead | 2 |
| R-09 | External write retries create duplicate events | Medium | Critical | Operation UUID, private metadata, uncertain-outcome reconciliation | Timeout after provider request | Calendar lead | 2 |
| R-10 | Planner overloads the user | High | High | Capacity reserve, hard load ceiling, red-team day/week | Committed > available or rest displaced | Product/Behavior | 1 |
| R-11 | Priority score looks scientifically exact | Medium | Medium | Plain-language explanation, confidence, rounded debug score | User treats decimal as certainty | Product | 1 |
| R-12 | Recovery becomes a guilt mechanism | Medium | High | Root-cause taxonomy, intentional skip, recovery metrics over streaks | Language blames user; fake check-ins | Behavior/UX | 1 |
| R-13 | Minimum viable work becomes meaningless | Medium | Medium | Definition of done and separate completion type | Tiny action counted full | Behavior/QA | 1 |
| R-14 | Financially irresponsible recommendation | Medium | High | Hard budget gates, unknown ≠ $0, no purchases, explicit assumptions | Cost exceeds budget or hidden fees | Finance guardrail | 1–3 |
| R-15 | Fitness guidance crosses into unsafe medical advice | Low | High | Approved templates only, scheduling scope, constraint blocks | Diagnosis/rehab claim generated | Fitness/QA | 1 |
| R-16 | Notification spam | High | High | Dedupe, caps, quiet hours, grouping, simulation tests | Cap exceeded or repeated object alerts | Notification lead | 2–3 |
| R-17 | Browser notification privacy leak | Medium | High | Minimal lock-screen content and user privacy mode | Sensitive detail in payload | Security/UX | 2 |
| R-18 | Background jobs replay or overlap | Medium | High | Durable idempotency key, lease, `SKIP LOCKED`, cron secret | Duplicate job side effect | Platform lead | 2 |
| R-19 | Google push notifications are treated as reliable | Medium | High | Periodic reconciliation and sync-needed semantics | Missing event without webhook | Calendar lead | 2 |
| R-20 | Opportunity source violates terms or law | Medium | High | Source approval record, API/feed preference, legal review | Scraping proposed without approval | Opportunity lead | 3 |
| R-21 | Prompt injection from retrieved content | High | Critical | Normalize/sanitize, read-only tools, no instructions, test corpus | Content asks for secrets/actions | Security/AI | 3 |
| R-22 | Unverified opportunity causes bad decision | High | High | Verification states, score cap, provenance, expiry | Missing authoritative evidence | Opportunity/QA | 3 |
| R-23 | Travel price is stale | High | Medium | Retrieval timestamp, short expiration, recheck | Quote age exceeds threshold | Travel lead | 3 |
| R-24 | Account deletion leaves orphaned personal data | Low | Critical | Orchestrated deletion and orphan scan | Row count or token remains | Security/DB | 1 |
| R-25 | Offline queue duplicates capture | Medium | Medium | Client UUID and server idempotency | Reconnect creates multiple rows | PWA lead | 1 |
| R-26 | Full offline editing creates conflicts | High | Medium | Defer; Phase 1 offline capture only | Request to edit arbitrary rows offline | Product/Architect | 1 |
| R-27 | Framework security vulnerability | Medium | Critical | Patched stable line, advisory checks, dependency automation | Next/React advisory | Platform/Security | All |
| R-28 | Vercel/serverless timeout interrupts sync | Medium | High | Batching, leases, resumable runs, bounded windows | Function termination mid-sync | Platform/Calendar | 1–2 |
| R-29 | Sensitive content leaks to analytics/error tools | Medium | Critical | Data minimization, scrubbers, test payloads | Title/note appears externally | Security | All |
| R-30 | Build agent declares completion without real evidence | High | High | Acceptance gates, evidence template, real provider test | Report contains screens only | QA/Program lead | All |
| R-31 | Houston starter dates are wrong | High | Medium | Mark unverified; no deadlines until confirmed | Conflicting date sources | Travel/Product | 1 |
| R-32 | Second-bedroom recommendation prematurely optimizes income | Medium | Medium | Multi-factor decision framework and user approval | Rental option auto-selected | Home/Product | 1 |
| R-33 | Trading study module encourages live trading prematurely | Medium | High | Paper-only starter plan and financial firewall | Live trade recommendation | Learning/Finance | 1 |
| R-34 | Provider credential costs surprise owner | Medium | Medium | Pre-approval cost check and status labels | Paid tier required | Program lead | All |
| R-35 | Schema becomes over-generalized and unmaintainable | Medium | High | Specific domain tables plus shared task unit; migration review | EAV or generic JSON replaces constraints | Architect/DB | All |

## Escalation

- Severity 1: active security breach, data loss, unauthorized external write, cross-user exposure. Stop release and disable affected capability.
- Severity 2: major workflow corruption, duplicate Calendar writes, account deletion failure, persistent false operational truth. Block release.
- Severity 3: material degraded workflow with workaround. Fix before next phase gate.
- Severity 4: minor UX or low-impact defect. Track with owner and target milestone.
