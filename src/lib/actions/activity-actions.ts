"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createActivity(
  chartId: string,
  parentId: string | null = null,
  isGroup: boolean = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  // Get next sort_order scoped to the same parent
  let query = admin
    .from("activities")
    .select("sort_order")
    .eq("chart_id", chartId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data: existing } = await query;
  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  // Inherit color from parent group
  let color = "#3B82F6";
  if (parentId && !isGroup) {
    const { data: parent } = await admin
      .from("activities")
      .select("color")
      .eq("id", parentId)
      .single();
    if (parent?.color) color = parent.color;
  }

  const { data, error } = await admin
    .from("activities")
    .insert({
      chart_id: chartId,
      title: isGroup ? "New Group" : "New Activity",
      sort_order: nextOrder,
      parent_id: parentId,
      is_group: isGroup,
      color,
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
    parent_id?: string | null;
    is_group?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("activities")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", activityId);

  if (error) throw new Error(error.message);
}

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("activities")
    .delete()
    .eq("id", activityId);
  if (error) throw new Error(error.message);
}

export async function bulkUpdateActivities(
  updates: {
    id: string;
    start_date?: string;
    end_date?: string;
    sort_order?: number;
    parent_id?: string | null;
  }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  for (const update of updates) {
    const { id, ...fields } = update;
    const { error } = await admin
      .from("activities")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
