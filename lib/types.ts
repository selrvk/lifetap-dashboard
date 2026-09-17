export type NextOfKin = {
  n: string; // name
  p: string; // phone
  r: string; // relationship
};
 
export type User = {
  id: string;
  n: string;           // full name
  dob: string;         // date of birth
  bt: string;          // blood type
  brg: string;         // barangay
  cty: string;         // city
  phn: string;         // phone number
  rel: string;         // religion
  od: boolean;         // organ donor
  a: string[];         // allergies
  c: string[];         // conditions
  meds: string[];      // medications
  kin: NextOfKin[];    // next of kin
  is_public: boolean;
  is_active: boolean;
  updated_at: string;
  // Consent tracking (DPA compliance)
  consent_given_at:     string | null;
  consent_version:      string | null;
  consent_withdrawn_at: string | null;
  consent_details:      ConsentChoices | null;
};
 
// Slim type for the users list — PII-heavy fields are excluded and only
// fetched on demand when a drawer opens (via /api/users/[id]).
export type UserRow = Omit<User, "phn" | "rel" | "kin" | "updated_at">;

export type PersonnelRole = "medic" | "responder" | "admin";
 
export type Personnel = {
  id: string;
  phone: string;
  full_name: string;
  role: PersonnelRole;
  badge_no: string | null;
  organization: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

// ─── Consent history (DPA / RA 10173 accountability) ────────────────────────
// Table `public.consent_events`, created by the mobile repo's migration.
// Append-only — the dashboard never writes to it.

export type ConsentEventType =
  | "given"
  | "renewed"
  | "changed"
  | "cloud_backup_given"
  | "withdrawn"
  | "account_deleted";

export type ConsentGuardian = {
  name: string;
  relationship: string;
};

export type ConsentChoices = {
  smsAlerts?: boolean;
  cloudBackup?: boolean;
  contactsConfirmed?: boolean;
  guardian?: ConsentGuardian | null;
};

export type ConsentEvent = {
  id: string;               // "ce-…" (app) or "srv-…" (server)
  owner_id: string;         // Supabase auth user id — no FK, outlives a deleted account
  profile_id: string | null; // users.id at the time of the event
  event: ConsentEventType;
  notice_version: string;
  choices: ConsentChoices;
  occurred_at: string;      // phone clock
  recorded_at: string;      // server clock
};

// Slim projection of `users` used to label a consent event's owner.
export type ConsentPersonRef = {
  id: string;
  n: string;
  phn: string;
  cty: string | null;
};

export type Report = {
  id: string;
  name: string;
  date: string;
  location: string;
  responder_name: string;
  responder_phone: string;
  city: string | null;
  entries: unknown[];
  created_at: string;
};