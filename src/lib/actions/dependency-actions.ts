"use server";

import { createClient } from "@/lib/supabase/server";

export async function addDependency(
  chartId: string,
  predecessorId: string,
  successorId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from("dependencies")
    .delete()
    .eq("id", depId);
  if (error) throw new Error(error.message);
}
