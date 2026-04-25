import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { PersonnelRole } from "@/lib/types";

export type CurrentPersonnel = {
  id: string;
  full_name: string;
  role: PersonnelRole;
  organization: string | null;
  city: string | null;
};

export async function requirePersonnel(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  me: CurrentPersonnel;
}> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const rawPhone = authUser.phone ?? "";
  const phone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;

  const { data: me } = await supabase
    .from("personnel")
    .select("id, full_name, role, organization, city, is_active")
    .eq("phone", phone)
    .single();

  if (!me || !me.is_active) redirect("/login");

  return {
    supabase,
    me: {
      id: me.id,
      full_name: me.full_name,
      role: me.role as PersonnelRole,
      organization: me.organization,
      city: me.city,
    },
  };
}
