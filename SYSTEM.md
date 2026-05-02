# LifeTap — Full System Reference

> Last updated: 2026-05-01  
> Use this document as context when continuing development, onboarding contributors, or building new features across either the dashboard or the mobile app.

---

## 1. What LifeTap Is

LifeTap is a disaster-response medical ID system built for Philippine Local Government Units (LGUs). It solves a real problem: in an emergency, first responders often have no way to know a victim's blood type, allergies, medications, or who to call.

The solution is a two-sided system:

- **Civilians** register their medical profile and write it to a physical NFC tag (a "LifeTap tag") they carry on their person — on a keychain, wristband, or wallet card.
- **Responders** (medics, barangay health workers, DRRMO staff) tap the tag with their phone at the scene and instantly see the victim's full medical profile.

The LGU admin side (this dashboard) manages the people and data behind both.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth (OTP)  │  │  PostgreSQL  │  │   Edge Functions     │  │
│  │  phone-based │  │  + RLS       │  │   (send-sms)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌──────────────────────┐
│  Mobile App     │  │  Admin Dashboard     │
│  React Native   │  │  Next.js 16 (App     │
│  iOS + Android  │  │  Router)             │
│                 │  │  lifetap-dashboard   │
│  Two personas:  │  │                      │
│  • Civilian     │  │  Personnel only —    │
│  • Responder    │  │  no civilian login   │
└─────────────────┘  └──────────────────────┘
```

### Tech Stack

| Layer | Mobile App | Dashboard |
|-------|-----------|-----------|
| Framework | React Native (bare) | Next.js 16.2 (App Router) |
| Language | TypeScript | TypeScript |
| Styling | NativeWind (Tailwind) | Inline styles + CSS vars |
| Auth | Supabase phone OTP | Supabase phone OTP |
| Database | Supabase (PostgreSQL) | Supabase (PostgreSQL) |
| Local storage | AsyncStorage | — (server-rendered) |
| NFC | React Native NFC library | — (not applicable) |
| SMS | Supabase Edge Function | — |
| Fonts | System | Plus Jakarta Sans + JetBrains Mono |

---

## 3. Roles & Authority

There are **four roles** in the system. Three exist in the `personnel` table (dashboard/responder users). One is implicit (civilians using the mobile app).

```
admin
  └── Full access to all cities, all data
  └── Can add / edit / deactivate personnel
  └── Can deactivate civilian profiles
  └── Can view audit log
  └── City-scope: ALL cities

medic
  └── Can view civilians + reports in their city only
  └── Cannot manage personnel
  └── Cannot view audit log
  └── City-scope: me.city only

responder
  └── Same as medic
  └── Typically field staff (barangay health workers, DRRMO)
  └── City-scope: me.city only

civilian (mobile app only)
  └── Registers their own profile
  └── No dashboard access
  └── Reads/writes their own NFC tag
  └── Cannot see other civilians' data
```

**Authority hierarchy:** admin → medic → responder

A medic and responder have identical dashboard permissions. The distinction exists for organizational/reporting purposes (e.g. a medic is a licensed health professional, a responder is field staff).

---

## 4. Database Schema

### `public.users` — Civilian medical profiles

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `n` | text | Full name (short key for NFC payload size) |
| `dob` | date | Date of birth |
| `bt` | text | Blood type (A+, B-, AB+, O-, etc.) |
| `brg` | text | Barangay |
| `cty` | text | City |
| `phn` | text | Phone number |
| `rel` | text | Religion |
| `od` | boolean | Organ donor flag |
| `is_public` | boolean | Whether non-logged-in responders can see full profile |
| `is_active` | boolean | Admin-controlled visibility flag (default true) |
| `a` | text[] | Allergies |
| `c` | text[] | Medical conditions |
| `meds` | text[] | Medications |
| `kin` | jsonb[] | Next of kin: `[{ n, p, r }]` (name, phone, relationship) |
| `updated_at` | timestamptz | Last profile update |
| `consent_given_at` | timestamptz | When civilian accepted the privacy notice |
| `consent_version` | text | Which version of the notice they accepted (e.g. "2024-v1") |
| `consent_withdrawn_at` | timestamptz | Set when civilian requests data deletion (DPA right to erasure) |

**Key distinction:** `is_active = false` = LGU admin deactivated the profile (duplicate, error, deceased). `consent_withdrawn_at IS NOT NULL` = civilian themselves requested deletion. These are separate events with different audit trails.

**Short column names** (`n`, `bt`, `brg`, etc.) exist because this data is also written to physical NFC tags. NFC NDEF payload size is limited (~1KB on most tags), so every byte counts.

---

### `public.personnel` — LGU staff accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `phone` | text | `+639XXXXXXXXX` format — must match Supabase auth phone |
| `full_name` | text | Display name |
| `role` | text | `admin` \| `medic` \| `responder` |
| `badge_no` | text? | Optional government badge/ID number |
| `organization` | text? | e.g. "Quezon City DRRMO" |
| `city` | text? | Scopes their data access |
| `is_active` | boolean | False = login blocked |
| `created_at` | timestamptz | When account was created |
| `last_login` | timestamptz? | Updated on each successful login |

**Phone format:** The `personnel` table stores `+639XXXXXXXXX`. Supabase Auth stores phones without the `+` prefix. The `requirePersonnel()` helper normalizes this: `rawPhone.startsWith("+") ? rawPhone : "+" + rawPhone`.

---

### `public.reports` — Incident/disaster reports

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `name` | text | Report name (e.g. "Typhoon Carina — Brgy. 123") |
| `date` | date | Incident date |
| `location` | text | Specific location |
| `city` | text? | City of the incident |
| `responder_name` | text | Name of the creating responder |
| `responder_phone` | text | Phone of the creating responder |
| `entries` | jsonb[] | Array of scanned victim profiles (ReportEntry) |
| `created_at` | timestamptz | When synced to cloud |

Reports are created **locally in the mobile app** (AsyncStorage), then synced to Supabase when the app comes to foreground. The `entries[]` array contains snapshots of victim profiles at scan time (not live references to `users` rows).

---

### `public.audit_log` — Access audit trail

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `actor_personnel_id` | uuid? | FK → personnel.id |
| `actor_phone` | text? | Redundant copy for historical accuracy |
| `actor_role` | text? | Role at time of action |
| `action` | text | e.g. `view_user_profile`, `export_users`, `create_personnel` |
| `resource_type` | text? | `user` \| `personnel` \| `report` |
| `resource_id` | uuid? | ID of the accessed record |
| `metadata` | jsonb | IP, user-agent, filters used, record count, etc. |
| `created_at` | timestamptz | When the action occurred |

RLS: only admins can `SELECT` from audit_log. Written via service-role client so it's never blocked by RLS.

**Logged actions:**
- `view_dashboard`, `list_users`, `list_personnel`, `list_reports`
- `view_user_profile`, `view_personnel_profile`, `view_report`
- `export_users`, `export_personnel`, `export_reports`
- `create_personnel`, `update_personnel`
- `deactivate_user`, `reactivate_user`

---

## 5. Row Level Security (RLS)

RLS is the primary data isolation layer. It runs at the PostgreSQL level and cannot be bypassed by application code.

### Helper functions (defined in `db/policies.sql`)

```sql
current_phone()  -- returns phone from JWT claim
current_role()   -- returns role from JWT claim  
current_city()   -- returns city from JWT claim
```

### Access rules

**`public.users`**
- `admin`: read all rows
- `medic` / `responder`: read only rows where `cty ILIKE current_city() || '%'`
- Nobody can insert/update/delete via application (civilians write their own via the mobile app's auth session)
- `is_active = false` rows are filtered at query level in the dashboard (not RLS — admins need to be able to reactivate them)

**`public.personnel`**
- `admin`: full CRUD
- `medic` / `responder`: read all active personnel in their city; update their own row only (limited fields)

**`public.reports`**
- `admin`: full CRUD
- `medic` / `responder`: read reports in their city; insert reports in their city

**`public.audit_log`**
- `admin`: SELECT only (via admin client)
- All others: no access

---

## 6. Authentication Flow

### Dashboard (personnel login)

```
1. Personnel navigates to /login
2. Enters their +639XXXXXXXXX phone number
3. Supabase sends OTP via SMS
4. Personnel enters OTP → Supabase creates/resumes session
5. requirePersonnel() is called on every protected route:
   a. Gets authUser from Supabase session
   b. Normalizes phone: rawPhone.startsWith("+") ? rawPhone : "+" + rawPhone
   c. Queries personnel table WHERE phone = normalized
   d. If not found OR is_active = false → redirect("/login")
   e. Returns { supabase, me } where me = { id, full_name, role, city, organization, is_active }
6. Role determines what data is visible (via RLS + application-level scoping)
7. IdleGuard client component auto-logs out after 30 minutes of inactivity
```

**Important:** Adding a person to the `personnel` table with their phone number is all that's needed to grant access. There's no separate invite flow — they just try to log in with their phone and Supabase sends an OTP. The `requirePersonnel()` lookup either finds their record (access granted) or doesn't (redirected to login).

### Mobile App (civilian + responder login)

```
1. User opens app
2. Enters +639XXXXXXXXX phone number
3. Supabase OTP sent
4. OTP entered → session established
5. App checks Supabase user metadata or personnel table to determine role
6. Role = civilian (not in personnel table) → Civilian tab navigator shown
7. Role = medic/responder/admin (found in personnel table) → Responder tab navigator shown
8. Session stored locally as CloudSession (includes role + personnel fields)
9. Session expiry checked on each read from AsyncStorage
```

---

## 7. Dashboard — Features & Flows

The dashboard is at `/dashboard` and requires personnel login. All pages are server components with client table components for interactivity.

### Layout

```
/dashboard/layout.tsx
  └── NavBar (name, role, theme toggle, logout)
  └── IdleGuard (30-min idle auto-logout)
  └── <children />
```

### Pages

#### `/dashboard` — Home

- Greeting with actual name + role (e.g. "Good afternoon, Juan dela Cruz · Medic")
- Stats cards: Total Registered Users, Total Reports, Total Personnel, Active Personnel
- Non-admins see stats scoped to their city only
- Quick links to Users, Personnel, Reports, Audit Log (admin only)

#### `/dashboard/users` — Civilian Profiles

Server-side filtered and paginated (50 per page).

**Filters:** Name/city search (debounced 400ms), blood type dropdown, organ donor toggle  
**Table columns:** Name + ID, Age/DOB, Blood Type, Location (city + barangay), Conditions, Allergies, Medications, Status

**Drawer (click a row):**
- Fetched on-demand from `/api/users/[id]` (logs `view_user_profile`)
- Shows full profile: Identity, Allergies, Medical Conditions, Medications, Next of Kin, Consent section
- **Admin only:** "Admin Actions" section with Deactivate/Reactivate button
  - Deactivate requires a confirmation step ("Deactivate [Name]?" with Cancel / Yes, Deactivate)
  - Reactivate is one-click (safe action, no confirmation)
  - On deactivate: profile disappears from the list immediately, drawer closes

**Export:** Fetch-based CSV button. Shows error toast on 429 (rate limited) instead of silently failing.

#### `/dashboard/personnel` — LGU Staff

Server-side filtered and paginated (50 per page).

**Filters:** Name/phone/org/city search, role dropdown, active-only toggle  
**Table columns:** Name + phone, Role, Badge No., Organization, City, Last Login, Status

**Drawer (click a row):**
- Fetched from `/api/personnel/[id]` (logs `view_personnel_profile`)
- Shows full profile with activity (member since, last login)
- **Admin only:** "Edit Personnel" button → opens edit form drawer

**Add Personnel (admin only):**
- "Add Personnel" button in page header
- Opens blank form drawer
- Fields: Full Name*, Phone* (+639XXXXXXXXX validated), Role*, Badge No., City (Philippine cities dropdown), Organization, Active checkbox
- Role field is **locked (disabled)** when editing an existing admin account
- Duplicate phone → 409 error shown in form
- Submit → POST `/api/personnel` → audit logged → page refreshes

**Edit Personnel (admin only):**
- Opens pre-populated form with same fields
- Submit → PATCH `/api/personnel/[id]` → audit logged → page refreshes
- Cannot change another admin's role (locked at API + UI level)

#### `/dashboard/reports` — Incident Reports

Server-side filtered and paginated (25 per page).

**Filters:** Name/location/responder search, city dropdown  
**Table columns:** Report Name, Incident Date, Location, City, Responder, Entries (page), Created At

**Drawer (click a row):**
- Fetched from `/api/reports/[id]`
- Shows report metadata + victim entries list
- Each entry shows the victim's name, blood type, allergies, conditions, medications

#### `/dashboard/audit` — Audit Log (admin only)

- Non-admins are redirected to `/dashboard`
- Paginated (50 per page), newest first
- **Filters:** Actor name search, action type dropdown
- **Columns:** Timestamp, Actor name + role, Action, Resource type + ID, IP address
- Uses admin/service-role client to join with personnel table for actor names

---

## 8. Mobile App — Features & Flows

### Civilian Side

**HomeScreen**
- Sync status dashboard: shows whether profile is in sync with NFC tag and/or cloud
- Sync indicators: `syncedToTag` and `syncedToCloud` from LocalUser
- Buttons: Write to Tag, Upload to Cloud

**ProfileScreen**
- View and edit their full medical profile
- Fields match `public.users` columns
- Saves locally first, then syncs to cloud

**SettingsScreen**
- Account settings, app preferences

**NFC Overlays**
- `WriteNFC`: writes LocalUser data to physical NFC tag
- `ReadNFC`: reads a tag (used by responders, also accessible to civilians)
- `SyncOverlay`: uploads profile to Supabase
- `Success`: confirmation after write/sync

### Responder Side

**ScanScreen**
- Big "Scan LifeTap Tag" button — primary action
- Can start/stop a named disaster report session
- Shows last 5 scans in the active report
- When a report is active, every scan automatically adds the victim to the report

**ReportsScreen**
- List of all past reports created by this responder

**ReportDetailScreen**
- Full victim list for a specific report
- Shows each victim's name, blood type, key medical info

**NewReportScreen**
- Create a named report with location + date
- Report saved locally in AsyncStorage, synced to Supabase on foreground

**NFCResultScreen (shared)**
- Shown after any tag scan (by anyone)
- Displays victim's full profile
- Responders see medical details (allergies, conditions, meds, next of kin)
- Civilians see only public info
- If an active report is open: victim is automatically added to it
- **SMS to next of kin:** Responders can trigger an SMS alert from this screen → Supabase Edge Function `send-sms`

---

## 9. Data Flow: NFC Tag

```
Civilian registers profile in app
        ↓
Profile saved to AsyncStorage (LocalUser)
        ↓
Civilian taps "Write to Tag"
        ↓
App serializes LocalUser → NDEF payload (JSON, compressed)
        ↓
NFC write → physical tag now contains profile data
        ↓
─────────────── Emergency happens ───────────────
        ↓
Responder opens app → ScanScreen
        ↓
Responder taps tag with phone
        ↓
NFC read → NDEF payload decoded → profile shown in NFCResultScreen
        ↓
(Optional) If active report open → victim added to entries[]
(Optional) SMS sent to next of kin via Edge Function
        ↓
Report synced to Supabase on app foreground
        ↓
LGU admin views report in dashboard → /dashboard/reports
```

**Offline capability:** The entire scan→profile display→add to report flow works offline. AsyncStorage is the source of truth. Supabase sync happens opportunistically when connectivity is available.

---

## 10. Data Flow: Report Sync

```
Responder creates report in NewReportScreen
        ↓
Report saved to AsyncStorage: { id, name, date, location, entries: [] }
        ↓
Responder scans tags → entries[] grows in AsyncStorage
        ↓
App comes to foreground (or explicit sync trigger)
        ↓
App upserts report to Supabase reports table
        ↓
Dashboard shows report in /dashboard/reports
        ↓
Admin can view victim entries, export to CSV
```

---

## 11. API Routes (Dashboard)

All routes require a valid Supabase session + personnel record. Admin-only routes return 403 for non-admins.

### Record fetch (audit-logged)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/users/[id]` | GET | Any personnel | Full user profile for drawer |
| `/api/users/[id]` | PATCH | Admin | Toggle `is_active` |
| `/api/personnel/[id]` | GET | Any personnel | Full personnel record |
| `/api/personnel/[id]` | PATCH | Admin | Update personnel fields |
| `/api/personnel` | POST | Admin | Create new personnel account |
| `/api/reports/[id]` | GET | Any personnel | Full report with entries |

### Export (rate-limited: 10/hour per actor)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/export/users` | GET | Any personnel | CSV of filtered users |
| `/api/export/personnel` | GET | Any personnel | CSV of filtered personnel |
| `/api/export/reports` | GET | Any personnel | CSV of filtered reports |

**Rate limit implementation:** Queries `audit_log` for recent export actions by the actor in a rolling 60-minute window. No external dependency — uses the existing audit infrastructure.

---

## 12. Security Model

### Layers (defense in depth)

1. **Supabase Auth** — OTP-based, no passwords. Session JWTs expire and must be refreshed.
2. **RLS** — enforced at PostgreSQL level. Application code cannot bypass it regardless of bugs.
3. **`requirePersonnel()`** — every server route/page calls this. Checks session + active personnel record.
4. **`is_active` check** — inactive personnel are redirected even with a valid session.
5. **IdleGuard** — 30-minute client-side idle timeout. Listens to mouse/keyboard/touch events.
6. **City scoping** — medics/responders cannot query data outside their city at the application layer (RLS provides the same guarantee at the DB layer).
7. **Admin-only routes** — role check returns 403 immediately before any DB query.
8. **Export rate limiting** — 10 exports/hour per actor via audit_log count.
9. **Audit log** — every data access is traceable. Written via service-role client, never blockable.

### DPA (Data Privacy Act of the Philippines) compliance

- **Consent tracking:** `consent_given_at`, `consent_version`, `consent_withdrawn_at` on every user record
- **Right to erasure:** Setting `consent_withdrawn_at` marks civilian-initiated deletion requests. `is_active = false` marks admin-initiated deactivation. These are semantically distinct.
- **Audit trail:** All data access by LGU personnel is logged with actor identity, action, resource ID, and IP address.
- **Data minimization:** `UserRow` type (used in list queries) excludes PII fields (`phn`, `rel`, `kin`). Full PII only loaded on explicit drawer open.
- **NPC registration:** Required paperwork for the LGU — not a code concern.

---

## 13. Key Files Reference

### Dashboard (`lifetap-dashboard`)

```
app/
  layout.tsx                    Root layout, lang="en-PH", metadata
  actions/
    auth.ts                     logout() server action (used by client table components)
  dashboard/
    layout.tsx                  Dashboard shell + IdleGuard
    page.tsx                    Home/stats page
    DashboardView.tsx           Stats cards + quick links
    IdleGuard.tsx               30-min idle timeout client component
    loading.tsx                 Shimmer skeletons
    error.tsx                   Error boundary (ErrorScreen component)
    users/
      page.tsx                  Server: fetch + filter users
      usersTable.tsx            Client: table, drawer, deactivate UI
      loading.tsx / error.tsx
    personnel/
      page.tsx                  Server: fetch + filter personnel
      personnelTable.tsx        Client: table, view drawer, add/edit form drawer
      loading.tsx / error.tsx
    reports/
      page.tsx                  Server: fetch + filter reports
      reportsTable.tsx          Client: table, drawer
      loading.tsx / error.tsx
    audit/
      page.tsx                  Server: fetch audit log (admin only)
      auditTable.tsx            Client: audit log table + filters

api/
  users/[id]/route.ts           GET (view) + PATCH (is_active toggle)
  personnel/route.ts            POST (create)
  personnel/[id]/route.ts       GET (view) + PATCH (update)
  reports/[id]/route.ts         GET (view)
  export/
    users/route.ts              CSV export
    personnel/route.ts          CSV export
    reports/route.ts            CSV export

lib/
  types.ts                      User, UserRow, Personnel, PersonnelRole, Report, NextOfKin
  audit.ts                      logAudit() — server-only audit writer
  rate-limit.ts                 checkExportRateLimit() — 10/hour via audit_log
  auth/
    personnel.ts                requirePersonnel() — central auth helper
  supabase/
    client.ts                   Browser Supabase client
    server.ts                   Server Supabase client (cookie-based)
    admin.ts                    Service-role client (bypasses RLS)
  constants/
    ph-cities.ts                All Philippine chartered cities (sorted)
  theme.ts                      Theme utilities

components/
  NavBar.tsx                    Top nav with name, role, theme toggle, logout
  ThemeToggle.tsx               Light/dark toggle pill (used inside NavBar)
  Pagination.tsx                Shared pagination with ellipsis
  ExportButton.tsx              Fetch-based CSV export with 429 toast

db/
  policies.sql                  RLS helper functions + all policies
  audit.sql                     audit_log table + indexes
  consent.sql                   Adds consent columns to users
  users-active.sql              Adds is_active to users
```

---

## 14. Philippine Cities List

`lib/constants/ph-cities.ts` contains all ~120 chartered cities in the Philippines, alphabetically sorted with `localeCompare("en-PH")`. Disambiguated names are used where cities share names:

- `Naga (Camarines Sur)` vs `Naga (Cebu)`
- `Talisay (Cebu)` vs `Talisay (Negros Occidental)`
- `San Carlos (Pangasinan)` vs `San Carlos (Negros Occidental)`
- `San Fernando (La Union)` vs `San Fernando (Pampanga)`

Used in the personnel add/edit form city dropdown. Not currently used in the civilian profile (civilians enter their city as free text in the mobile app).

---

## 15. Known Gaps & Future Work

### High priority
- **QR code fallback** — If a civilian loses/forgets their NFC tag, responders have no backup access method. A QR code per civilian (generated in the app, printable) + a public `/e/[id]` emergency web route (no login required, reads `is_public` flag) would close this gap.
- **Responder onboarding UX** — Currently the admin adds a personnel record and the person just tries to log in. There's no notification/email to the new person. An SMS via the Edge Function would help.

### Medium priority
- **Show deactivated users** — Admins currently can't see inactive profiles at all. An "Include Inactive" toggle in the users table would allow reviewing and reactivating them without needing DB access.
- **Print/PDF per record** — LGU staff frequently need physical printouts for inter-agency coordination.
- **Consent version re-obtainment flow** — When the privacy notice version changes, the app should prompt civilians to re-accept. `consent_version` field supports this but the prompting logic isn't built yet.
- **Session re-auth in mobile app** — When the Supabase session expires mid-use in the field, the app should prompt for OTP re-auth rather than silently failing.

### Lower priority
- **Mobile-responsive dashboard** — Dashboard is office-facing; responders use the app. Responsive layout would help on tablets.
- **SMS/push alerts** — Notify the on-duty admin when a new report is filed.
- **Personnel self-edit** — Currently personnel can't update their own organization or badge number from the dashboard (only admins can edit).
- **Soft-delete for reports** — No way to mark a report as erroneous without deleting it.
- **Offline support for dashboard** — Not planned; dashboard is office-use only.

### Deployment checklist (before go-live)
- [ ] Run all SQL migrations: `policies.sql` → `audit.sql` → `consent.sql` → `users-active.sql`
- [ ] Enable RLS on all tables in Supabase dashboard
- [ ] Set Supabase OTP rate limit (recommended: 5 OTPs per phone per hour)
- [ ] Configure environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Register system with the National Privacy Commission (NPC) — required for DPA compliance
- [ ] Brief LGU admin staff on how to onboard new personnel
- [ ] Test NFC write/read on target devices (NFC behavior varies by Android OEM)
