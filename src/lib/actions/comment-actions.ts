"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectComment } from "@/lib/types";

export async function getComments(chartId: string): Promise<ProjectComment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_comments")
    .select("*, profiles(id, email, full_name, avatar_url)")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as ProjectComment[];
}

export async function addComment(
  chartId: string,
  content: string
): Promise<ProjectComment> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_comments")
    .insert({
      chart_id: chartId,
      user_id: user.id,
      content,
    })
    .select("*, profiles(id, email, full_name, avatar_url)")
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectComment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  // Verify ownership
  const { data: comment } = await admin
    .from("project_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment || comment.user_id !== user.id) {
    throw new Error("Not authorized");
  }

  const { error } = await admin
    .from("project_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw new Error(error.message);
}
