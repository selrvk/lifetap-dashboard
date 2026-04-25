---
name: Auth and access model
description: Confirmed working two-tier RLS access model and audit trail
type: project
---

Two-tier access model is implemented and user-confirmed working:

- **admin** — sees all users, personnel, reports across all cities; full write access
- **medic / responder** — identical permissions; scoped to their assigned `city`; can file reports in their city; can update their own personnel row

**Why:** LGU use case — each city's personnel should only see their city's data. Single super-tier of admins above that.

**How to apply:** If the user asks about adding a new role or splitting medic vs responder permissions, reference this decision and ask what specifically differs before splitting policies.

RLS policies are in `db/policies.sql`. Write policies and audit log table are in `db/audit.sql`. Both have been applied to Supabase.

Per-record audit logging is wired — every drawer open hits `/api/users/[id]`, `/api/personnel/[id]`, or `/api/reports/[id]` which writes to `audit_log` with actor, resource, IP, and user agent.
