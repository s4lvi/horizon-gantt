"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCanEditChart } from "@/lib/authz";

type Admin = ReturnType<typeof createAdminClient>;

async function assertCanEditActivity(
  admin: Admin,
  userId: string,
  activityId: string
) {
  const { data: activity } = await admin
    .from("activities")
    .select("chart_id")
    .eq("id", activityId)
    .single();
  if (!activity) throw new Error("Activity not found");
  await assertCanEditChart(admin, userId, activity.chart_id);
}

async function assertCanEditItem(admin: Admin, userId: string, itemId: string) {
  const { data: item } = await admin
    .from("activity_checklist_items")
    .select("activity_id")
    .eq("id", itemId)
    .single();
  if (!item) throw new Error("Checklist item not found");
  await assertCanEditActivity(admin, userId, item.activity_id);
}

export async function createChecklistItem(activityId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!title.trim() || title.length > 500) throw new Error("Invalid title");

  const admin = createAdminClient();
  await assertCanEditActivity(admin, user.id, activityId);

  const { data: existing } = await admin
    .from("activity_checklist_items")
    .select("sort_order")
    .eq("activity_id", activityId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await admin
    .from("activity_checklist_items")
    .insert({
      activity_id: activityId,
      title,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateChecklistItem(
  itemId: string,
  updates: {
    title?: string;
    is_done?: boolean;
    sort_order?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (updates.title !== undefined && (!updates.title.trim() || updates.title.length > 500)) {
    throw new Error("Invalid title");
  }

  const admin = createAdminClient();
  await assertCanEditItem(admin, user.id, itemId);

  const { error } = await admin
    .from("activity_checklist_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

export async function deleteChecklistItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  await assertCanEditItem(admin, user.id, itemId);

  const { error } = await admin
    .from("activity_checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}
