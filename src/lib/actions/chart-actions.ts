"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createChart(orgId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("charts")
    .insert({
      title: "Untitled Chart",
      owner_id: user.id,
      organization_id: orgId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  redirect(`/charts/${data.id}`);
}

export async function updateChart(
  chartId: string,
  updates: { title?: string; description?: string }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("charts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", chartId);

  if (error) throw new Error(error.message);
  revalidatePath(`/charts/${chartId}`);
}

export async function deleteChart(chartId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("charts").delete().eq("id", chartId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
