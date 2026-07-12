"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createChecklistItem(activityId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

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

  const admin = createAdminClient();

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

  const { error } = await admin
    .from("activity_checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}
