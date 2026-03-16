"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SharePermission } from "@/lib/types";

export async function shareChart(
  chartId: string,
  email: string,
  permission: SharePermission
) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) {
    throw new Error("User not found. They must sign up first.");
  }

  const { error } = await supabase.from("chart_shares").upsert(
    {
      chart_id: chartId,
      user_id: profile.id,
      permission,
    },
    { onConflict: "chart_id,user_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/charts/${chartId}`);
}

export async function removeShare(shareId: string, chartId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chart_shares")
    .delete()
    .eq("id", shareId);
  if (error) throw new Error(error.message);
  revalidatePath(`/charts/${chartId}`);
}

export async function getChartShares(chartId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chart_shares")
    .select("*, profiles(*)")
    .eq("chart_id", chartId);

  if (error) throw new Error(error.message);
  return data;
}
