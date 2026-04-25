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