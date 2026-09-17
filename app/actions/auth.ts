"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function checkPersonnelPhone(phone: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("personnel")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return data !== null;
}