import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const phone = authUser.phone ?? "";

  // ── Fetch logged-in personnel record ──────────────────────────────
  const { data: me } = await supabase
    .from("personnel")
    .select("full_name, role, organization, city")
    .eq("phone", phone)
    .single();

  // ── Aggregate: users ──────────────────────────────────────────────
  const { data: users } = await supabase
    .from("users")
    .select("bt, cty, od, is_public, a, c, meds");

  // ── Aggregate: personnel ──────────────────────────────────────────
  const { data: personnel } = await supabase
    .from("personnel")
    .select("role, is_active");

  // ── Compute stats ─────────────────────────────────────────────────
  const totalUsers = users?.length ?? 0;
  const publicUsers = users?.filter((u) => u.is_public).length ?? 0;
  const organDonors = users?.filter((u) => u.od).length ?? 0;
  const withAllergies = users?.filter((u) => u.a?.length > 0).length ?? 0;
  const withConditions = users?.filter((u) => u.c?.length > 0).length ?? 0;
  const withMeds = users?.filter((u) => u.meds?.length > 0).length ?? 0;

  // Blood type distribution
  const bloodMap: Record<string, number> = {};
  users?.forEach((u) => {
    if (u.bt) bloodMap[u.bt] = (bloodMap[u.bt] ?? 0) + 1;
  });
  const bloodTypes = Object.entries(bloodMap)
    .sort((a, b) => b[1] - a[1]);

  // City distribution
  const cityMap: Record<string, number> = {};
  users?.forEach((u) => {
    if (u.cty) {
      const label = u.cty.split(",")[0].trim(); // "Batangas City" from "Batangas City, Batangas"
      cityMap[label] = (cityMap[label] ?? 0) + 1;
    }
  });
  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);

  // Personnel by role
  const roleMap: Record<string, number> = {};
  personnel?.forEach((p) => {
    if (p.is_active) roleMap[p.role] = (roleMap[p.role] ?? 0) + 1;
  });
  const totalPersonnel = personnel?.filter((p) => p.is_active).length ?? 0;

  return (
    <DashboardView
      personnelName={me?.full_name ?? "Administrator"}
      personnelRole={me?.role ?? "admin"}
      personnelOrg={me?.organization ?? null}
      stats={{
        totalUsers,
        publicUsers,
        organDonors,
        withAllergies,
        withConditions,
        withMeds,
        totalPersonnel,
      }}
      bloodTypes={bloodTypes}
      cities={cities}
      roleMap={roleMap}
    />
  );
}