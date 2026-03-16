"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { SharePermission } from "@/lib/types";

export async function shareChart(
  chartId: string,
  email: string,
  permission: SharePermission
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) {
    throw new Error("User not found. They must sign up first.");
  }

  const { error } = await admin.from("chart_shares").upsert(
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("chart_shares")
    .delete()
    .eq("id", shareId);
  if (error) throw new Error(error.message);
  revalidatePath(`/charts/${chartId}`);
}

export async function getChartShares(chartId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chart_shares")
    .select("*, profiles(*)")
    .eq("chart_id", chartId);

  if (error) throw new Error(error.message);
  return data;
}

export async function createShareLink(
  chartId: string,
  permission: SharePermission
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chart_share_links")
    .insert({
      chart_id: chartId,
      permission,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getShareLinks(chartId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chart_share_links")
    .select("*")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteShareLink(linkId: string, chartId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("chart_share_links")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/charts/${chartId}`);
}

export async function acceptShareLink(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("chart_share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (!link) throw new Error("Invalid or expired link");
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error("This link has expired");
  }

  // Check if already shared
  const { data: existing } = await admin
    .from("chart_shares")
    .select("id")
    .eq("chart_id", link.chart_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    await admin.from("chart_shares").insert({
      chart_id: link.chart_id,
      user_id: user.id,
      permission: link.permission,
    });
  }

  return link.chart_id;
}
