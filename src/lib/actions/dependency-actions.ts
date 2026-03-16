"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addDependency(
  chartId: string,
  predecessorId: string,
  successorId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dependencies")
    .insert({
      chart_id: chartId,
      predecessor_id: predecessorId,
      successor_id: successorId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeDependency(depId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("dependencies")
    .delete()
    .eq("id", depId);
  if (error) throw new Error(error.message);
}
