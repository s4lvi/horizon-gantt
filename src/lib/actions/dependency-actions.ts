"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCanEditChart } from "@/lib/authz";

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
  await assertCanEditChart(admin, user.id, chartId);

  // Both endpoints must belong to the chart being edited.
  const { data: endpoints } = await admin
    .from("activities")
    .select("id")
    .eq("chart_id", chartId)
    .in("id", [predecessorId, successorId]);
  if ((endpoints || []).length !== 2) {
    throw new Error("Activities not found in this chart");
  }

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

  const { data: dep } = await admin
    .from("dependencies")
    .select("chart_id")
    .eq("id", depId)
    .single();
  if (!dep) throw new Error("Dependency not found");
  await assertCanEditChart(admin, user.id, dep.chart_id);

  const { error } = await admin
    .from("dependencies")
    .delete()
    .eq("id", depId);
  if (error) throw new Error(error.message);
}
