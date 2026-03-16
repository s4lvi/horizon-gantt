"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createActivity(chartId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("activities")
    .select("sort_order")
    .eq("chart_id", chartId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("activities")
    .insert({
      chart_id: chartId,
      title: "New Activity",
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateActivity(
  activityId: string,
  updates: {
    title?: string;
    start_date?: string | null;
    end_date?: string | null;
    color?: string;
    assignee_id?: string | null;
    sort_order?: number;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", activityId);

  if (error) throw new Error(error.message);
}

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId);
  if (error) throw new Error(error.message);
}

export async function bulkUpdateActivities(
  updates: { id: string; start_date?: string; end_date?: string; sort_order?: number }[]
) {
  const supabase = await createClient();
  for (const update of updates) {
    const { id, ...fields } = update;
    const { error } = await supabase
      .from("activities")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
