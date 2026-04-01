import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User } from "@/lib/types";
import UsersTable from "./usersTable";

export default async function UsersPage() {
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

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .order("n", { ascending: true });

  if (error) {
    console.error("Failed to fetch users:", error.message);
  }

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <UsersTable
        users={(users as User[]) ?? []}
        personnelName={me?.full_name ?? "Administrator"}
        personnelRole={me?.role ?? "admin"}
      />
    </div>
  );
}