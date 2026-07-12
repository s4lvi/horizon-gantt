"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCanEditChart } from "@/lib/authz";

async function touchChart(admin: ReturnType<typeof createAdminClient>, chartId: string) {
  await admin
    .from("charts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chartId);
}

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
  await assertCanEditChart(admin, user.id, chartId);

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
  await touchChart(admin, chartId);
  return data;
}

export async function updateActivity(
  activityId: string,
  updates: {
    title?: string;
    description?: string | null;
    notes?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    color?: string;
    assignee_id?: string | null;
    sort_order?: number;
    parent_id?: string | null;
    is_group?: boolean;
    is_done?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: activity } = await admin
    .from("activities")
    .select("chart_id")
    .eq("id", activityId)
    .single();
  if (!activity) throw new Error("Activity not found");
  await assertCanEditChart(admin, user.id, activity.chart_id);

  const { error } = await admin
    .from("activities")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", activityId);

  if (error) throw new Error(error.message);
  await touchChart(admin, activity.chart_id);
}

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: activity } = await admin
    .from("activities")
    .select("chart_id")
    .eq("id", activityId)
    .single();
  if (!activity) throw new Error("Activity not found");
  await assertCanEditChart(admin, user.id, activity.chart_id);

  const { error } = await admin
    .from("activities")
    .delete()
    .eq("id", activityId);
  if (error) throw new Error(error.message);
  await touchChart(admin, activity.chart_id);
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
  if (updates.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  // Authorize against every distinct chart touched (normally just one).
  const { data: rows } = await admin
    .from("activities")
    .select("chart_id")
    .in(
      "id",
      updates.map((u) => u.id)
    );
  const chartIds = [...new Set((rows || []).map((r) => r.chart_id))];
  for (const chartId of chartIds) {
    await assertCanEditChart(admin, user.id, chartId);
  }

  // Run updates concurrently and aggregate failures instead of stopping at
  // the first error, so a partial failure is at least reported accurately.
  const timestamp = new Date().toISOString();
  const results = await Promise.all(
    updates.map(({ id, ...fields }) =>
      admin
        .from("activities")
        .update({ ...fields, updated_at: timestamp })
        .eq("id", id)
    )
  );
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    throw new Error(`${failed.length} of ${updates.length} updates failed`);
  }
}
