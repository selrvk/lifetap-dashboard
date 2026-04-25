import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const { supabase, me } = await requirePersonnel();

  // Stats are scoped by RLS + the same city filters used in detail pages,
  // so each role sees aggregates for the data they're allowed to see.
  const usersQ = supabase.from("users").select("bt, cty, od, is_public, a, c, meds");
  const personnelQ = supabase.from("personnel").select("role, is_active, city");

  if (me.role !== "admin" && me.city) {
    usersQ.ilike("cty", `${me.city}%`);
    personnelQ.eq("city", me.city);
  }

  const [{ data: users }, { data: personnel }] = await Promise.all([usersQ, personnelQ]);

  const totalUsers = users?.length ?? 0;
  const publicUsers = users?.filter((u) => u.is_public).length ?? 0;
  const organDonors = users?.filter((u) => u.od).length ?? 0;
  const withAllergies = users?.filter((u) => u.a?.length > 0).length ?? 0;
  const withConditions = users?.filter((u) => u.c?.length > 0).length ?? 0;
  const withMeds = users?.filter((u) => u.meds?.length > 0).length ?? 0;

  const bloodMap: Record<string, number> = {};
  users?.forEach((u) => {
    if (u.bt) bloodMap[u.bt] = (bloodMap[u.bt] ?? 0) + 1;
  });
  const bloodTypes = Object.entries(bloodMap).sort((a, b) => b[1] - a[1]);

  const cityMap: Record<string, number> = {};
  users?.forEach((u) => {
    if (u.cty) {
      const label = u.cty.split(",")[0].trim();
      cityMap[label] = (cityMap[label] ?? 0) + 1;
    }
  });
  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);

  const roleMap: Record<string, number> = {};
  personnel?.forEach((p) => {
    if (p.is_active) roleMap[p.role] = (roleMap[p.role] ?? 0) + 1;
  });
  const totalPersonnel = personnel?.filter((p) => p.is_active).length ?? 0;

  await logAudit({
    actor: me,
    action: "view_dashboard",
    metadata: { total_users: totalUsers, total_personnel: totalPersonnel },
  });

  return (
    <DashboardView
      personnelName={me.full_name}
      personnelRole={me.role}
      personnelOrg={me.organization}
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
