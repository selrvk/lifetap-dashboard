import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Personnel } from "@/lib/types";
import PersonnelTable from "./personnelTable";

export default async function PersonnelPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const phone = authUser.phone ?? "";

  const { data: me } = await supabase
    .from("personnel")
    .select("full_name, role")
    .eq("phone", phone)
    .single();

  const adminClient = createAdminClient();
  const { data: personnel, error } = await adminClient
    .from("personnel")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Failed to fetch personnel:", error.message);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PersonnelTable
        personnel={(personnel as Personnel[]) ?? []}
        personnelName={me?.full_name ?? "Administrator"}
        personnelRole={me?.role ?? "admin"}
      />
    </div>
  );
}
