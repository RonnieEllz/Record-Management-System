# Record Management System
## Engineering System Assessment

## 1. Scope and confidence

This document describes the repository as it exists today. The visible application is a Vite + React + TypeScript frontend that talks directly to Supabase using the public anon key. The repository contains one Supabase migration for transaction batches. No backend application source or complete database policy set is present in the workspace, so database behavior for existing tables must be verified in the deployed Supabase project.

Confirmed findings are marked as current behavior. Items that depend on deployed database configuration are marked for verification.

## 2. Current architecture

```text
Browser
  |
  | React UI, React Router, client-side role checks
  v
Supabase JavaScript client
  |
  | Auth session and PostgREST data calls
  v
Supabase Auth + PostgreSQL

Deployment: Vite build hosted by Vercel
```

### Frontend

- React 18 with TypeScript.
- Vite build tooling.
- React Router routes the authenticated application.
- Tailwind CSS and local CSS variables provide styling.
- Recharts renders revenue charts.
- Supabase JavaScript client handles authentication and database calls.

### Routes

- `/dashboard`: administrator overview.
- `/customers`: customer directory for non-technician users.
- `/jobs`: job queue for non-technician users.
- `/batches`: administrator batch management.
- `/finance`: administrator finance view.
- `/technician`: technician workspace.
- `/login`: unauthenticated entry point.

### Main modules

- `src/context/AuthContext.tsx`: restores and observes the Supabase session.
- `src/lib/auth.ts`: normalizes user roles from session metadata.
- `src/lib/rbac.ts`: maps roles to application actions.
- `src/lib/customers.ts`: customer queries and mutations.
- `src/lib/jobCards.ts`: job cards, services, job-service rows, and transaction batches.
- `src/components/JobDetailModal.tsx`: status transitions and administrator deletion control.
- `src/pages/JobsQueuePage.tsx`: daily/monthly/all-history queue views and batch operations.

## 3. Current role model

| Role | Primary responsibility | Current application capabilities |
| --- | --- | --- |
| Administrator | Oversight and control | Customer management, job monitoring, job updates, assignment, financial views, batch administration, service management, deletion |
| Receptionist | Intake and collections | Customer creation/update, job-card creation/update, service selection, receipt processing, batch closure |
| Technician | Workshop execution | Job viewing, status progression, assignment-related work, technician notes |

The administrator role no longer includes `createJobCards` in the frontend permission map. This removes the current creation controls from the administrator UI. It does not by itself prevent a direct database/API insert.

## 4. Core data and workflows

### Customer intake

Customer data is read from and written directly to the `customers` table. Search checks customer fields and separately searches `job_cards.job_reference`, then merges the results in the browser.

### Job-card creation

The creation flow:

1. Loads active services.
2. Loads today's transaction batch.
3. Rejects creation if there is no batch or the batch is closed.
4. Generates a job reference in the browser.
5. Inserts a job card.
6. Inserts a related job-service row.
7. Returns the mapped job card.

The second insert is currently non-transactional. If the job-service insert fails, the job card remains and the application only logs a warning.

### Job lifecycle

The visible lifecycle is:

```text
RECEIVED
  -> IN_PROGRESS
  -> WAITING_FOR_COLLECTION
  -> COLLECTED
```

The UI also recognizes `WAITING_FOR_INSPECTION`. Status transitions are selected in the job detail modal based on the supplied client role.

### Transaction batches

A batch is unique by `batch_date` and has `OPEN` or `CLOSED` status. Job creation resolves today's batch and uses it unless a caller supplies another batch ID. Administrators can review and reopen batches; receptionists can close them according to the frontend role map.

### Finance and export

Finance loads all job cards and all batches, calculates totals in the browser, and renders daily/monthly charts. Batch management exports job data as CSV in the browser.

## 5. Confirmed vulnerabilities and reliability risks

### High priority: client-side RBAC is not a security boundary

**Evidence:** `src/lib/rbac.ts` controls visible actions, while data mutations in `src/lib/customers.ts` and `src/lib/jobCards.ts` call Supabase directly. The role is resolved from session metadata and used by React components.

A user who can obtain a valid Supabase session can potentially call the same tables through the public client or another API client. Hiding a button does not enforce authorization.

**Impact:** unauthorized reads, inserts, updates, deletes, batch changes, or financial access if database policies are permissive.

**Fix:** enforce every role/action at the database layer with RLS policies based on trusted JWT claims, or route sensitive operations through a server-side API that validates the user and role. Keep frontend RBAC for usability only.

### High priority: transaction-batch RLS is too broad

**Evidence:** the migration creates authenticated-user `INSERT` and `UPDATE` policies on `transaction_batches` with no role, ownership, or column restrictions.

Any authenticated user may be able to create or update any batch if these are the active policies.

**Impact:** a technician or compromised account could open, close, reopen, or alter batch metadata, undermining financial controls.

**Fix:** replace broad policies with role-specific policies. Restrict close/reopen operations to authorized roles and preferably expose them through database functions that validate legal state transitions. Review and remove superseded policies because PostgreSQL combines permissive policies.

### High priority: authorization for existing tables is unknown

**Evidence:** the workspace does not include policies for `customers`, `job_cards`, `job_services`, or `services`.

**Impact:** the actual production security posture cannot be established from this repository. A permissive policy could expose all customers, job cards, contact details, revenue, or destructive operations.

**Fix:** export and review the deployed schema and all RLS policies. Add tests that attempt each operation as each role and as an unauthenticated user.

### High priority: multi-step job creation is not atomic

**Evidence:** `createJobCard` inserts into `job_cards`, then separately inserts into `job_services`. The second failure is logged and does not roll back the card.

**Impact:** orphaned or financially incomplete job records, inaccurate totals, and manual reconciliation work.

**Fix:** use a PostgreSQL function/RPC or trusted backend transaction that validates the batch, inserts the card and service line atomically, and returns the resulting record.

### Medium priority: browser-generated job references can collide

**Evidence:** references use the current date and `Math.random()`.

**Impact:** collisions are unlikely but possible, and identifiers are not guaranteed unique unless the database has a unique constraint.

**Fix:** generate references server-side and add a unique database constraint. Prefer a database sequence/UUID-backed identifier with a human-readable display reference.

### Medium priority: callers can supply a different batch ID

**Evidence:** job creation resolves today's batch but uses `payload.batch_id ?? resolvedBatch.id`.

**Impact:** a caller that bypasses the UI may assign a new job to an arbitrary batch, including a batch from another date or a closed batch, if database constraints do not prevent it.

**Fix:** ignore client-supplied batch IDs for normal creation or validate that the ID is today's open batch inside the transaction/RPC.

### Medium priority: status transitions are enforced in the UI only

**Evidence:** `JobDetailModal` chooses the next status based on `userRole`, then `updateJobCard` sends a generic update to Supabase.

**Impact:** direct callers may set invalid status transitions, alter assignments, or write receipt data outside the intended workflow unless RLS/database functions prevent it.

**Fix:** model allowed transitions in a database function or trigger. Validate actor role, current status, next status, required receipt number, and assignment rules server-side.

### Medium priority: deletion is a destructive two-step operation

**Evidence:** `deleteJobCard` deletes linked `job_services`, then deletes the job card. The administrator button is protected only by the client role check.

**Impact:** unauthorized or partial deletion; loss of financial and operational history.

**Fix:** replace hard deletion with a server-side, audited action or soft deletion. Use foreign-key cascade rules or an atomic transaction. Require a reason and record actor/time.

### Medium priority: finance calculations trust client-loaded data

**Evidence:** finance totals, batch summaries, and charts are calculated in React after loading job cards and batches.

**Impact:** reporting can be slow, inconsistent during concurrent writes, or wrong if row visibility is incomplete. The client is not a good source of authoritative financial aggregation.

**Fix:** provide database views/RPCs for approved aggregates, define reconciliation rules, and expose immutable or audited financial facts.

### Medium priority: sensitive confirmation uses repeated password sign-in

**Evidence:** batch close, reopen, and export flows call `signInWithPassword` in the browser before executing the operation.

**Impact:** reauthentication improves confirmation UX but does not establish that the operation is authorized for the role. It can also create session and operational complexity.

**Fix:** use Supabase reauthentication/MFA capabilities where appropriate, then enforce role authorization server-side. Do not treat password confirmation as a replacement for RLS.

### Medium priority: search filter construction is not robust

**Evidence:** customer search interpolates raw user input into a PostgREST `.or(...)` filter string.

**Impact:** special filter characters can cause malformed requests and potentially unexpected query behavior.

**Fix:** escape PostgREST filter values or move search to a parameterized database function. Add tests for commas, parentheses, percent signs, quotes, and long input.

### Medium priority: CSV export needs data-safety controls

**Evidence:** batch export builds CSV in the browser from database values.

**Impact:** spreadsheet formula injection is possible if a field begins with `=`, `+`, `-`, or `@`. Exported customer and financial data also needs access, retention, and download controls.

**Fix:** prefix dangerous spreadsheet values, restrict export permissions at the database/API layer, log exports, and define retention and secure handling rules.

### Lower priority: time-zone and date-boundary risk

**Evidence:** business dates use `new Date().toISOString().slice(0, 10)` and local date calculations in different screens.

**Impact:** around midnight or across time zones, a user may see or create data under the wrong business date.

**Fix:** define the workshop business time zone centrally and calculate batch dates server-side.

### Lower priority: no visible automated test suite

**Evidence:** the frontend package exposes build/dev/preview scripts but no test or lint script.

**Impact:** permission changes, status transitions, batch rules, and financial calculations can regress unnoticed.

**Fix:** add unit tests for RBAC and domain rules, integration tests for Supabase policies/RPCs, and browser tests for receptionist, administrator, and technician workflows.

## 6. Recommended target architecture

Keep the React frontend as the presentation layer, but move security-sensitive business operations behind trusted database functions or a backend service:

```text
React UI
  |
  | authenticated request
  v
Server action or PostgreSQL RPC
  |
  | role, state, ownership, and validation checks
  v
Atomic database transaction
  |
  v
PostgreSQL tables + audit records
```

Use the frontend role map to show or hide controls, but make the server/database decision authoritative.

## 7. Prioritized improvement plan

### Phase 0: verify production posture

- Export the deployed database schema and every RLS policy.
- Confirm whether tables expose customer, job, service, and financial data to all authenticated users.
- Identify the source of role claims and whether users can modify their own metadata.
- Confirm Supabase project backups, point-in-time recovery, and environment separation.

### Phase 1: close authorization gaps

- Add role-aware RLS policies for every table.
- Remove broad authenticated-user batch insert/update policies.
- Add server-side authorization for job creation, status changes, deletion, receipt updates, exports, and batch actions.
- Add negative tests for every role and unauthenticated access.

### Phase 2: protect business invariants

- Create an atomic `create_job_card` database function.
- Create controlled functions for status transitions and batch close/reopen.
- Enforce unique job references, valid service IDs, open current batches, and legal status transitions.
- Define whether job cards are immutable after collection and use adjustments instead of destructive edits.

### Phase 3: audit and operations

- Add an audit table for actor, action, entity, before/after values, timestamp, and request correlation ID.
- Add structured error reporting and monitoring.
- Log exports and sensitive reads where required by policy.
- Add reconciliation reports comparing job-service totals, receipts, and batch totals.

### Phase 4: quality and product maturity

- Add unit, integration, and end-to-end tests.
- Add CI for type checking, builds, tests, and dependency scanning.
- Add loading, retry, and empty-state standards across pages.
- Add pagination/server-side filtering for large customer and job datasets.
- Add accessibility checks and keyboard workflows.
- Add backup restore drills and documented incident response.

## 8. Engineering acceptance criteria

A production-ready release should meet these conditions:

- A user cannot perform an unauthorized operation by bypassing the UI.
- All job creation and batch mutations are atomic and auditable.
- A job cannot be attached to an invalid or closed batch.
- Status transitions are validated against current state and actor role.
- Financial totals are calculated from authoritative server-side data.
- Customer and financial data are protected by tested RLS policies.
- Destructive actions are audited and recoverable.
- CI blocks releases when type checks, tests, or security checks fail.
- The system has documented backup, recovery, monitoring, and ownership procedures.
