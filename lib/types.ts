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
  updated_at: string;
};
 
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