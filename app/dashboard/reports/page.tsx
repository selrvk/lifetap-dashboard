import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Report } from "@/lib/types";
import ReportsTable from "./reportsTable";

export default async function ReportsPage() {
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
  const { data: reports, error } = await adminClient
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch reports:", error.message);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ReportsTable
        reports={(reports as Report[]) ?? []}
        personnelName={me?.full_name ?? "Administrator"}
        personnelRole={me?.role ?? "admin"}
      />
    </div>
  );
}
